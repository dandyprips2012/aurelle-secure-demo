package com.example.payments;

import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.time.Duration;
import java.util.Locale;
import java.util.Random;
import java.util.UUID;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import org.eclipse.jetty.server.Server;
import org.eclipse.jetty.servlet.ServletContextHandler;
import org.eclipse.jetty.servlet.ServletHolder;
import org.json.JSONException;
import org.json.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * payments-service: authorises payments for the storefront and records them in Postgres.
 *
 *   GET  /healthz
 *   POST /authorize        {orderRef, amount, currency, customerEmail}
 *   GET  /payments/{orderRef}
 *
 * After a payment is authorised it calls inventory-service (/commit) so the held stock becomes a sale.
 * Settings: PORT, PGHOST/PGPORT/PGUSER/PGPASSWORD/PGDATABASE/PGSCHEMA, INVENTORY_URL.
 */
public final class App {

    private static final Logger log = LoggerFactory.getLogger(App.class);
    private static final String SCHEMA = env("PGSCHEMA", "shopapp");
    private static final String INVENTORY_URL = env("INVENTORY_URL", "http://127.0.0.1:8091");
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(3)).build();
    private static final Random RANDOM = new Random();
    private static HikariDataSource db;

    private App() {}

    private static String env(String key, String fallback) {
        String v = System.getenv(key);
        return v == null || v.isBlank() ? fallback : v;
    }

    public static void main(String[] args) throws Exception {
        HikariConfig cfg = new HikariConfig();
        cfg.setJdbcUrl("jdbc:postgresql://" + env("PGHOST", "127.0.0.1") + ":" + env("PGPORT", "5432") + "/" + env("PGDATABASE", "analytics")
                + "?ApplicationName=" + env("PGAPPNAME", "payments-service") + "&currentSchema=" + SCHEMA);
        cfg.setUsername(env("PGUSER", "analytics_rw"));
        cfg.setPassword(System.getenv("PGPASSWORD"));
        cfg.setMaximumPoolSize(8);
        cfg.setPoolName("payments-pool");
        db = new HikariDataSource(cfg);
        initSchema();

        int port = Integer.parseInt(env("PORT", "8092"));
        Server server = new Server(port);
        ServletContextHandler ctx = new ServletContextHandler(ServletContextHandler.NO_SESSIONS);
        ctx.setContextPath("/");
        ctx.addServlet(new ServletHolder(new Health()), "/healthz");
        ctx.addServlet(new ServletHolder(new Authorize()), "/authorize");
        ctx.addServlet(new ServletHolder(new Lookup()), "/payments/*");
        server.setHandler(ctx);
        server.start();
        log.info("payments-service started on port {} (inventory at {})", port, INVENTORY_URL);
        server.join();
    }

    private static void initSchema() throws SQLException {
        try (Connection c = db.getConnection(); Statement s = c.createStatement()) {
            s.execute("CREATE TABLE IF NOT EXISTS " + SCHEMA + ".payments ("
                    + "id bigserial PRIMARY KEY, order_ref text NOT NULL UNIQUE, amount numeric(12,2) NOT NULL, currency text NOT NULL, "
                    + "customer_email text NOT NULL, status text NOT NULL, reason text, auth_code text, "
                    + "created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now())");
            s.execute("CREATE INDEX IF NOT EXISTS payments_status_idx ON " + SCHEMA + ".payments (status, created_at)");
            s.execute("CREATE INDEX IF NOT EXISTS payments_email_idx ON " + SCHEMA + ".payments (customer_email)");
        }
    }

    // ---- helpers -------------------------------------------------------------------------------------------------

    private static void reply(HttpServletResponse resp, int status, JSONObject body) throws IOException {
        resp.setStatus(status);
        resp.setContentType("application/json");
        resp.setCharacterEncoding("UTF-8");
        resp.getWriter().write(body.toString());
    }

    private static JSONObject readBody(HttpServletRequest req) throws IOException {
        String text = new String(req.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        return new JSONObject(text.isBlank() ? "{}" : text);
    }

    /** Asks inventory-service to turn the held stock for this order into a sale. */
    private static int commitStock(String orderRef) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder(URI.create(INVENTORY_URL + "/commit"))
                .timeout(Duration.ofSeconds(5))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(new JSONObject().put("orderRef", orderRef).toString()))
                .build();
        return HTTP.send(request, HttpResponse.BodyHandlers.ofString()).statusCode();
    }

    // ---- servlets ------------------------------------------------------------------------------------------------

    static final class Health extends HttpServlet {
        @Override
        protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
            reply(resp, 200, new JSONObject().put("status", "ok").put("service", "payments-service"));
        }
    }

    static final class Authorize extends HttpServlet {
        @Override
        protected void doPost(HttpServletRequest req, HttpServletResponse resp) throws IOException {
            JSONObject body;
            String orderRef;
            double amount;
            String email;
            String currency;
            try {
                body = readBody(req);
                orderRef = body.getString("orderRef");
                amount = body.getDouble("amount");
                email = body.optString("customerEmail", "").trim().toLowerCase(Locale.ROOT);
                currency = body.optString("currency", "USD");
            } catch (JSONException e) {
                reply(resp, 400, new JSONObject().put("error", "orderRef and a numeric amount are required"));
                return;
            }
            if (amount <= 0 || email.isEmpty()) {
                reply(resp, 400, new JSONObject().put("error", "amount must be positive and customerEmail is required"));
                return;
            }

            try {
                // The issuing bank is occasionally slow; this shows up as a long span in the trace.
                if (RANDOM.nextInt(20) == 0) {
                    Thread.sleep(600 + RANDOM.nextInt(500));
                }

                String declineReason = null;
                if (email.endsWith("@declined.test")) {
                    declineReason = "card declined by issuer";
                } else if (amount > 4000) {
                    declineReason = "amount above the single-payment limit";
                } else if (recentFailures(email) >= 3) {
                    declineReason = "too many declined attempts for this customer";
                }

                if (declineReason != null) {
                    save(orderRef, amount, currency, email, "declined", declineReason, null);
                    log.warn("payment declined for {}: {}", orderRef, declineReason);
                    reply(resp, 402, new JSONObject().put("status", "declined").put("reason", declineReason).put("orderRef", orderRef));
                    return;
                }

                String authCode = "AUTH-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
                long paymentId = save(orderRef, amount, currency, email, "authorized", null, authCode);

                int commit = commitStock(orderRef);
                if (commit >= 300) {
                    updateStatus(orderRef, "voided", "stock could not be committed (inventory returned " + commit + ")");
                    log.error("voided payment for {}: inventory commit returned {}", orderRef, commit);
                    reply(resp, 502, new JSONObject().put("status", "voided").put("reason", "stock commit failed").put("orderRef", orderRef));
                    return;
                }
                log.info("payment {} authorised for {} ({} {})", paymentId, orderRef, amount, currency);
                reply(resp, 200, new JSONObject().put("status", "authorized").put("paymentId", paymentId).put("authCode", authCode).put("orderRef", orderRef));
            } catch (SQLException e) {
                log.error("database error while authorising {}", orderRef, e);
                reply(resp, 500, new JSONObject().put("error", "payment store unavailable"));
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                reply(resp, 503, new JSONObject().put("error", "interrupted"));
            }
        }

        private static int recentFailures(String email) throws SQLException {
            String sql = "SELECT count(*) FROM payments WHERE customer_email = ? AND status = 'declined' AND created_at > now() - interval '15 minutes'";
            try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
                ps.setString(1, email);
                try (ResultSet rs = ps.executeQuery()) {
                    rs.next();
                    return rs.getInt(1);
                }
            }
        }

        private static long save(String orderRef, double amount, String currency, String email, String status, String reason, String authCode) throws SQLException {
            String sql = "INSERT INTO payments (order_ref, amount, currency, customer_email, status, reason, auth_code) VALUES (?, ?, ?, ?, ?, ?, ?) "
                    + "ON CONFLICT (order_ref) DO UPDATE SET status = EXCLUDED.status, reason = EXCLUDED.reason, auth_code = EXCLUDED.auth_code, updated_at = now() RETURNING id";
            try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
                ps.setString(1, orderRef);
                ps.setBigDecimal(2, java.math.BigDecimal.valueOf(amount));
                ps.setString(3, currency);
                ps.setString(4, email);
                ps.setString(5, status);
                ps.setString(6, reason);
                ps.setString(7, authCode);
                try (ResultSet rs = ps.executeQuery()) {
                    rs.next();
                    return rs.getLong(1);
                }
            }
        }

        private static void updateStatus(String orderRef, String status, String reason) throws SQLException {
            try (Connection c = db.getConnection();
                    PreparedStatement ps = c.prepareStatement("UPDATE payments SET status = ?, reason = ?, updated_at = now() WHERE order_ref = ?")) {
                ps.setString(1, status);
                ps.setString(2, reason);
                ps.setString(3, orderRef);
                ps.executeUpdate();
            }
        }
    }

    static final class Lookup extends HttpServlet {
        @Override
        protected void doGet(HttpServletRequest req, HttpServletResponse resp) throws IOException {
            String path = req.getPathInfo();
            String ref = path == null ? "" : path.replaceFirst("^/", "");
            if (ref.isEmpty()) {
                reply(resp, 400, new JSONObject().put("error", "order reference required"));
                return;
            }
            String sql = "SELECT id, amount, currency, status, reason, auth_code, created_at FROM payments WHERE order_ref = ?";
            try (Connection c = db.getConnection(); PreparedStatement ps = c.prepareStatement(sql)) {
                ps.setString(1, ref);
                try (ResultSet rs = ps.executeQuery()) {
                    if (!rs.next()) {
                        reply(resp, 404, new JSONObject().put("error", "no payment for " + ref));
                        return;
                    }
                    reply(resp, 200, new JSONObject().put("paymentId", rs.getLong("id")).put("orderRef", ref).put("amount", rs.getBigDecimal("amount"))
                            .put("currency", rs.getString("currency")).put("status", rs.getString("status"))
                            .put("reason", rs.getString("reason") == null ? JSONObject.NULL : rs.getString("reason"))
                            .put("authCode", rs.getString("auth_code") == null ? JSONObject.NULL : rs.getString("auth_code"))
                            .put("createdAt", rs.getTimestamp("created_at").toInstant().toString()));
                }
            } catch (SQLException e) {
                log.error("lookup failed for {}", ref, e);
                reply(resp, 500, new JSONObject().put("error", "payment store unavailable"));
            }
        }
    }
}
