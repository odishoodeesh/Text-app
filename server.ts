import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

console.log(`[SERVER START] NODE_ENV: ${process.env.NODE_ENV}`);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "https://xwmdotzhgerirsydgbnc.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bWRvdHpoZ2VyaXJzeWRnYm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDc5MzIsImV4cCI6MjA4NzYyMzkzMn0.qFulksccdbSPx4marSQ3euFbfO1TqaosEO2rumwndjc";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // GLOBAL LOG - Catch every single request
  app.use((req, res, next) => {
    console.log(`[SERVER LOG] ${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      time: new Date().toISOString()
    });
  });

  // Auth Routes
  app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }
    
    const { error } = await supabase
      .from('users')
      .insert([{ username, password }]);

    if (error) {
      if (error.code === '23505') {
        return res.status(400).json({ error: "Username already exists" });
      }
      return res.status(500).json({ error: error.message });
    }
    
    res.json({ success: true });
  });

  app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !user) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    res.json({ success: true, username: user.username });
  });

  // API Routes
  app.get("/api/posts", async (req, res) => {
    const { data: posts, error } = await supabase
      .from('posts')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) return res.status(500).json({ error: error.message });
    res.json(posts || []);
  });

  app.post("/api/posts", async (req, res) => {
    const { username, content } = req.body;
    if (!username || !content) {
      return res.status(400).json({ error: "Username and content are required" });
    }
    
    const { data: newPost, error } = await supabase
      .from('posts')
      .insert([{ username, content }])
      .select()
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }
    
    res.json(newPost);
  });

  app.put("/api/posts/:id", async (req, res) => {
    const { id } = req.params;
    const { username, content } = req.body;

    const { data: updatedPost, error } = await supabase
      .from('posts')
      .update({ content })
      .eq('id', id)
      .eq('username', username)
      .select()
      .single();
    
    if (error) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }
    res.json(updatedPost);
  });

  app.delete("/api/posts/:id", async (req, res) => {
    const { id } = req.params;
    const { username } = req.body;

    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', id)
      .eq('username', username);
    
    if (error) {
      return res.status(404).json({ error: "Post not found or unauthorized" });
    }
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve(__dirname, "dist", "index.html"));
    });
  }

  // Final catch-all for debugging
  app.use((req, res) => {
    if (req.url.startsWith('/api')) {
      res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
    } else {
      res.status(404).send("Page not found");
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
