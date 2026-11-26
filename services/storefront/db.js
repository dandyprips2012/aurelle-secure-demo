const { Pool, types } = require("pg");
const products = require("./productCatalog");

// Postgres returns BIGINT and NUMERIC as strings; the API returned plain numbers with SQLite.
types.setTypeParser(20, (v) => Number(v));
types.setTypeParser(1700, (v) => parseFloat(v));

const SCHEMA = process.env.PGSCHEMA || "shopapp";

// Connection settings come from the standard PG* environment variables
// (PGHOST, PGPORT, PGUSER, PGPASSWORD, PGDATABASE). Defaults point at the local server.
const pool = new Pool({
  host: process.env.PGHOST || "127.0.0.1",
  port: parseInt(process.env.PGPORT, 10) || 5432,
  user: process.env.PGUSER || "analytics_rw",
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE || "analytics",
  application_name: process.env.PGAPPNAME || "node-app",
  options: `-c search_path=${SCHEMA}`,
  max: 10,
});

async function initialize() {
  await pool.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA}`);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ${SCHEMA}.products (
      id integer PRIMARY KEY,
      sku text NOT NULL UNIQUE,
      name text NOT NULL,
      category text NOT NULL,
      price numeric(10,2) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ${SCHEMA}.orders (
      id bigserial PRIMARY KEY,
      customername text NOT NULL,
      customeremail text NOT NULL,
      shippingstreet text NOT NULL,
      shippingcity text NOT NULL,
      shippingstate text NOT NULL,
      shippingzip text NOT NULL,
      shippingcountry text NOT NULL,
      notes text,
      subtotal numeric(12,2) NOT NULL,
      discount numeric(12,2) NOT NULL,
      tax numeric(12,2) NOT NULL,
      shipping numeric(12,2) NOT NULL,
      total numeric(12,2) NOT NULL,
      createdatutc timestamptz NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ${SCHEMA}.orderitems (
      id bigserial PRIMARY KEY,
      orderid bigint NOT NULL REFERENCES ${SCHEMA}.orders(id),
      productid integer NOT NULL REFERENCES ${SCHEMA}.products(id),
      productname text NOT NULL,
      quantity integer NOT NULL,
      unitprice numeric(10,2) NOT NULL,
      linetotal numeric(12,2) NOT NULL
    );

    ALTER TABLE ${SCHEMA}.orders ADD COLUMN IF NOT EXISTS orderref text;
    CREATE INDEX IF NOT EXISTS orders_orderref_idx ON ${SCHEMA}.orders (orderref);
    CREATE INDEX IF NOT EXISTS orderitems_orderid_idx ON ${SCHEMA}.orderitems (orderid);
    CREATE INDEX IF NOT EXISTS orders_createdatutc_idx ON ${SCHEMA}.orders (createdatutc);
  `);

  const { rows } = await pool.query("SELECT COUNT(*)::int AS c FROM products");
  if (rows[0].c === 0) {
    const values = [];
    const params = [];
    products.forEach((p, i) => {
      values.push(`($${i * 5 + 1}, $${i * 5 + 2}, $${i * 5 + 3}, $${i * 5 + 4}, $${i * 5 + 5})`);
      params.push(...p);
    });
    await pool.query(
      `INSERT INTO products (id, sku, name, category, price) VALUES ${values.join(", ")} ON CONFLICT (id) DO NOTHING`,
      params
    );
  }
}

module.exports = { pool, initialize };
