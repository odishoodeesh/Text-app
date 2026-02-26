import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "https://xwmdotzhgerirsydgbnc.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bWRvdHpoZ2VyaXJzeWRnYm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDc5MzIsImV4cCI6MjA4NzYyMzkzMn0.qFulksccdbSPx4marSQ3euFbfO1TqaosEO2rumwndjc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function startServer() {
  const app = express();
  app.use(express.json());

  // GLOBAL LOG
  app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", time: new Date().toISOString() });
  });

  // OAuth Callback for Supabase
  app.get("/auth/callback", (req, res) => {
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  });

  // API Routes
  app.get("/api/posts", async (req, res) => {
    try {
      const { data: posts, error } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      res.json(posts || []);
    } catch (err: any) {
      console.error("GET /api/posts error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/posts", async (req, res) => {
    try {
      const { user_id, email, content } = req.body;
      if (!user_id || !content) {
        return res.status(400).json({ error: "User ID and content are required" });
      }
      console.log(`Attempting to post for user_id: ${user_id}`);
      const { data: newPost, error } = await supabase.from('posts').insert([{ user_id, email, content }]).select().single();
      if (error) throw error;
      res.json(newPost);
    } catch (err: any) {
      console.error("POST /api/posts error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.put("/api/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id, content } = req.body;
      const { data: updatedPost, error } = await supabase.from('posts').update({ content }).eq('id', id).eq('user_id', user_id).select().single();
      if (error) throw error;
      res.json(updatedPost);
    } catch (err: any) {
      console.error("PUT /api/posts error:", err);
      res.status(404).json({ error: "Update failed: " + err.message });
    }
  });

  app.delete("/api/posts/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id } = req.body;
      const { error } = await supabase.from('posts').delete().eq('id', id).eq('user_id', user_id);
      if (error) throw error;
      res.json({ success: true });
    } catch (err: any) {
      console.error("DELETE /api/posts error:", err);
      res.status(404).json({ error: "Delete failed: " + err.message });
    }
  });

  // Vite / Static Serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => res.sendFile(path.resolve(__dirname, "dist", "index.html")));
  }

  // Final catch-all for debugging
  app.use((req, res) => {
    if (req.url.startsWith('/api')) {
      res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
    } else {
      res.status(404).send("Page not found");
    }
  });

  const PORT = 3000;
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  return app;
}

const appPromise = startServer();

export default appPromise;
