"""inventory-service: tracks stock for the storefront and holds it while an order is being paid for.

Endpoints
  GET  /healthz
  GET  /stock/<product_id>   how many units can be sold right now
  POST /reserve              {orderRef, items:[{productId, quantity}]}  hold stock, 409 when there is not enough
  POST /commit               {orderRef}  turn a hold into a sale (called by payments-service after authorising)
  POST /release              {orderRef}  give a hold back (called by node-app when payment is declined)

Tables live in the shared Postgres schema (default shopapp) next to the storefront's products table.
Settings come from the standard PG* environment variables plus PORT and PGSCHEMA.
"""
import logging
import os
import threading
import time

# Turn tracing on before Flask and psycopg2 are imported. run.ps1 sets DD_SERVICE for traced runs.
if os.environ.get("DD_SERVICE"):
    import ddtrace.auto  # noqa: F401

import psycopg2
from flask import Flask, jsonify, request
from psycopg2.pool import ThreadedConnectionPool

SCHEMA = os.environ.get("PGSCHEMA", "shopapp")
PORT = int(os.environ.get("PORT", "8091"))
RESTOCK_EVERY_SECONDS = int(os.environ.get("RESTOCK_EVERY_SECONDS", "300"))

class TraceDefaults(logging.Filter):
    """ddtrace adds dd.trace_id / dd.span_id when log injection is on; fall back to 0 when it is not."""

    def filter(self, record):
        for key in ("dd.trace_id", "dd.span_id"):
            if not hasattr(record, key):
                setattr(record, key, "0")
        return True


logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s [dd.trace_id=%(dd.trace_id)s dd.span_id=%(dd.span_id)s]")
for _handler in logging.getLogger().handlers:
    _handler.addFilter(TraceDefaults())
log = logging.getLogger("inventory-service")

pool = ThreadedConnectionPool(
    1,
    10,
    host=os.environ.get("PGHOST", "127.0.0.1"),
    port=int(os.environ.get("PGPORT", "5432")),
    user=os.environ.get("PGUSER", "analytics_rw"),
    password=os.environ.get("PGPASSWORD"),
    dbname=os.environ.get("PGDATABASE", "analytics"),
    application_name=os.environ.get("PGAPPNAME", "inventory-service"),
    options=f"-c search_path={SCHEMA}",
)

app = Flask(__name__)


class Conn:
    """Borrow a pooled connection; commit on success, roll back on error."""

    def __enter__(self):
        self.conn = pool.getconn()
        self.cur = self.conn.cursor()
        return self.cur

    def __exit__(self, exc_type, exc, tb):
        if exc_type:
            self.conn.rollback()
        else:
            self.conn.commit()
        self.cur.close()
        pool.putconn(self.conn)
        return False


def init_db():
    # The storefront creates the products table at its own start-up; wait for it.
    for _ in range(60):
        with Conn() as cur:
            cur.execute("SELECT to_regclass(%s)", (f"{SCHEMA}.products",))
            if cur.fetchone()[0]:
                break
        log.info("waiting for %s.products (start node-app first)", SCHEMA)
        time.sleep(2)
    else:
        raise SystemExit("products table not found; start node-app once so it creates it")

    with Conn() as cur:
        cur.execute(
            f"""
            CREATE TABLE IF NOT EXISTS {SCHEMA}.inventory (
              product_id integer PRIMARY KEY REFERENCES {SCHEMA}.products(id),
              on_hand integer NOT NULL,
              reserved integer NOT NULL DEFAULT 0,
              updated_at timestamptz NOT NULL DEFAULT now()
            );
            CREATE TABLE IF NOT EXISTS {SCHEMA}.stock_reservations (
              id bigserial PRIMARY KEY,
              order_ref text NOT NULL,
              product_id integer NOT NULL REFERENCES {SCHEMA}.products(id),
              quantity integer NOT NULL,
              status text NOT NULL,
              created_at timestamptz NOT NULL DEFAULT now(),
              updated_at timestamptz NOT NULL DEFAULT now()
            );
            CREATE INDEX IF NOT EXISTS stock_reservations_order_idx ON {SCHEMA}.stock_reservations (order_ref);
            CREATE INDEX IF NOT EXISTS stock_reservations_status_idx ON {SCHEMA}.stock_reservations (status, created_at);
            """
        )
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.inventory (product_id, on_hand)
            SELECT id, 80 + (id * 37) % 120 FROM {SCHEMA}.products
            ON CONFLICT (product_id) DO NOTHING
            """
        )
    log.info("inventory tables ready")


def error(status, message, **extra):
    return jsonify({"error": message, **extra}), status


@app.get("/healthz")
def healthz():
    return jsonify({"status": "ok", "service": "inventory-service"})


@app.get("/stock/<int:product_id>")
def stock(product_id):
    with Conn() as cur:
        cur.execute("SELECT on_hand, reserved FROM inventory WHERE product_id = %s", (product_id,))
        row = cur.fetchone()
    if not row:
        return error(404, f"Product {product_id} has no stock record")
    return jsonify({"productId": product_id, "onHand": row[0], "reserved": row[1], "available": row[0] - row[1]})


@app.post("/reserve")
def reserve():
    body = request.get_json(silent=True) or {}
    order_ref = body.get("orderRef")
    items = body.get("items") or []
    if not order_ref or not items:
        return error(400, "orderRef and at least one item are required")
    try:
        wanted = {}
        for item in items:
            qty = int(item["quantity"])
            if qty <= 0:
                raise ValueError
            wanted[int(item["productId"])] = wanted.get(int(item["productId"]), 0) + qty
    except (KeyError, TypeError, ValueError):
        return error(400, "Each item needs an integer productId and a positive integer quantity")

    with Conn() as cur:
        cur.execute("SELECT status FROM stock_reservations WHERE order_ref = %s LIMIT 1", (order_ref,))
        if cur.fetchone():
            return jsonify({"orderRef": order_ref, "status": "held", "note": "already reserved"})
        # lock rows in a fixed order so two orders never wait on each other in a cycle
        for product_id in sorted(wanted):
            cur.execute("SELECT on_hand, reserved FROM inventory WHERE product_id = %s FOR UPDATE", (product_id,))
            row = cur.fetchone()
            if not row:
                return error(404, f"Product {product_id} has no stock record", productId=product_id)
            available = row[0] - row[1]
            if available < wanted[product_id]:
                log.warning("insufficient stock for product %s: wanted %s, available %s", product_id, wanted[product_id], available)
                return error(409, f"Not enough stock for product {product_id}", productId=product_id, available=available, requested=wanted[product_id])
        for product_id, qty in wanted.items():
            cur.execute("UPDATE inventory SET reserved = reserved + %s, updated_at = now() WHERE product_id = %s", (qty, product_id))
            cur.execute(
                "INSERT INTO stock_reservations (order_ref, product_id, quantity, status) VALUES (%s, %s, %s, 'held')",
                (order_ref, product_id, qty),
            )
    log.info("reserved stock for %s (%d products)", order_ref, len(wanted))
    return jsonify({"orderRef": order_ref, "status": "held", "items": [{"productId": p, "quantity": q} for p, q in wanted.items()]})


def _settle(order_ref, new_status, sell):
    with Conn() as cur:
        cur.execute(
            "SELECT product_id, quantity FROM stock_reservations WHERE order_ref = %s AND status = 'held' FOR UPDATE",
            (order_ref,),
        )
        held = cur.fetchall()
        if not held:
            return None
        for product_id, qty in held:
            if sell:
                cur.execute(
                    "UPDATE inventory SET on_hand = on_hand - %s, reserved = reserved - %s, updated_at = now() WHERE product_id = %s",
                    (qty, qty, product_id),
                )
            else:
                cur.execute(
                    "UPDATE inventory SET reserved = reserved - %s, updated_at = now() WHERE product_id = %s",
                    (qty, product_id),
                )
        cur.execute(
            "UPDATE stock_reservations SET status = %s, updated_at = now() WHERE order_ref = %s AND status = 'held'",
            (new_status, order_ref),
        )
        return len(held)


@app.post("/commit")
def commit():
    order_ref = (request.get_json(silent=True) or {}).get("orderRef")
    if not order_ref:
        return error(400, "orderRef is required")
    count = _settle(order_ref, "committed", sell=True)
    if count is None:
        return error(404, f"No held stock for order {order_ref}")
    return jsonify({"orderRef": order_ref, "status": "committed", "lines": count})


@app.post("/release")
def release():
    order_ref = (request.get_json(silent=True) or {}).get("orderRef")
    if not order_ref:
        return error(400, "orderRef is required")
    count = _settle(order_ref, "released", sell=False)
    if count is None:
        return jsonify({"orderRef": order_ref, "status": "nothing to release"})
    return jsonify({"orderRef": order_ref, "status": "released", "lines": count})


def housekeeping():
    """Every few minutes: free holds that were never settled and top up low stock."""
    while True:
        time.sleep(RESTOCK_EVERY_SECONDS)
        try:
            with Conn() as cur:
                cur.execute(
                    f"""
                    WITH stale AS (
                      UPDATE {SCHEMA}.stock_reservations SET status = 'expired', updated_at = now()
                      WHERE status = 'held' AND created_at < now() - interval '10 minutes'
                      RETURNING product_id, quantity
                    )
                    UPDATE {SCHEMA}.inventory i SET reserved = GREATEST(0, i.reserved - s.q), updated_at = now()
                    FROM (SELECT product_id, sum(quantity) AS q FROM stale GROUP BY product_id) s
                    WHERE i.product_id = s.product_id
                    """
                )
                expired = cur.rowcount
                cur.execute(f"UPDATE {SCHEMA}.inventory SET on_hand = on_hand + 100, updated_at = now() WHERE on_hand - reserved < 25")
                restocked = cur.rowcount
            log.info("housekeeping: %d product holds expired, %d products restocked", expired, restocked)
        except psycopg2.Error as exc:
            log.error("housekeeping failed: %s", exc)


if __name__ == "__main__":
    init_db()
    threading.Thread(target=housekeeping, daemon=True).start()
    # threaded dev server is enough for a demo; ddtrace-run instruments Flask and psycopg2 automatically
    app.run(host="0.0.0.0", port=PORT, threaded=True)
