import React, { useState, useEffect } from 'react';
import { Send, User, LogOut, MessageSquare, Lock, UserPlus, LogIn, Edit2, Trash2, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || "https://xwmdotzhgerirsydgbnc.supabase.co";
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh3bWRvdHpoZ2VyaXJzeWRnYm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDc5MzIsImV4cCI6MjA4NzYyMzkzMn0.qFulksccdbSPx4marSQ3euFbfO1TqaosEO2rumwndjc";
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Post {
  id: number;
  username: string;
  content: string;
  created_at: string;
}

export default function App() {
  const [username, setUsername] = useState<string | null>(localStorage.getItem('textpost_user'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'error'>('checking');

  useEffect(() => {
    // Check connection to backend
    fetch('/api/health')
      .then(res => res.ok ? setDbStatus('connected') : setDbStatus('error'))
      .catch(() => setDbStatus('error'));
  }, []);

  useEffect(() => {
    if (username) {
      fetchPosts();
    }
  }, [username]);

  const fetchPosts = async () => {
    try {
      const url = '/api/posts';
      const response = await fetch(url);
      
      if (!response.ok) {
        return;
      }

      const data = await response.json();
      setPosts(data);
    } catch (error) {
      console.error('Failed to fetch posts:', error);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    
    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: loginUsername,
          password: loginPassword,
        });
        
        if (error) throw error;
        
        if (data.user && data.session) {
          // Signed up and logged in immediately
          localStorage.setItem('textpost_user', data.user.email!);
          setUsername(data.user.email!);
        } else {
          setError('Check your email for a confirmation link!');
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: loginUsername,
          password: loginPassword,
        });
        
        if (error) throw error;
        
        if (data.user) {
          localStorage.setItem('textpost_user', data.user.email!);
          setUsername(data.user.email!);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('textpost_user');
    setUsername(null);
    setLoginUsername('');
    setLoginPassword('');
    setError(null);
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !username) return;

    setIsLoading(true);
    setError(null);
    try {
      const url = '/api/posts';
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content: newPostContent.trim() }),
      });
      
      if (response.ok) {
        setNewPostContent('');
        fetchPosts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to post');
      }
    } catch (error: any) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (postId: number) => {
    if (!editContent.trim() || !username) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, content: editContent.trim() }),
      });
      if (response.ok) {
        setEditingPostId(null);
        fetchPosts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update post');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (postId: number) => {
    if (!username || !window.confirm('Are you sure you want to delete this post?')) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      });
      if (response.ok) {
        fetchPosts();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete post');
      }
    } catch (err) {
      setError('Connection error');
    } finally {
      setIsLoading(false);
    }
  };

  if (!username) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] flex items-center justify-center p-4 font-sans">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-sm p-8 border border-black/5"
        >
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-semibold text-zinc-900">TextPost</h1>
            <p className="text-zinc-500 text-sm mt-1">
              {isRegistering ? 'Create a new account' : 'Log in to your account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className={`p-3 rounded-xl text-sm ${error.includes('successful') ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                {error}
              </div>
            )}
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="email"
                placeholder="Email Address"
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                required
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
              <input
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                required
              />
            </div>
            <button
              type="submit"
              className="w-full bg-black text-white py-4 rounded-2xl font-medium hover:bg-zinc-800 transition-colors active:scale-[0.98] flex items-center justify-center gap-2"
            >
              {isRegistering ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
              {isRegistering ? 'Register' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button 
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
              }}
              className="text-sm text-zinc-500 hover:text-black transition-colors"
            >
              {isRegistering ? 'Already have an account? Log in' : "Don't have an account? Register"}
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                <MessageSquare className="text-white w-4 h-4" />
              </div>
              <span className="font-semibold text-zinc-900">TextPost</span>
              <div className={`ml-2 w-2 h-2 rounded-full ${dbStatus === 'connected' ? 'bg-emerald-500' : dbStatus === 'error' ? 'bg-red-500' : 'bg-amber-500 animate-pulse'}`} title={dbStatus === 'connected' ? 'Server Connected' : 'Server Connection Error'} />
            </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-100 rounded-full">
              <User className="w-4 h-4 text-zinc-500" />
              <span className="text-sm font-medium text-zinc-700">{username}</span>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-zinc-400 hover:text-zinc-900 transition-colors"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-4 p-4 bg-red-50 text-red-600 rounded-2xl text-sm border border-red-100 flex items-center justify-between"
            >
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">✕</button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Post Form */}
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-black/5 mb-8">
          <form onSubmit={handlePost}>
            <textarea
              placeholder="What's on your mind?"
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="w-full min-h-[120px] p-4 bg-zinc-50 border border-zinc-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none mb-4"
              required
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading || !newPostContent.trim()}
                className="flex items-center gap-2 bg-black text-white px-6 py-2.5 rounded-xl font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {isLoading ? 'Posting...' : (
                  <>
                    <span>Post</span>
                    <Send className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Posts List */}
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-2xl p-6 border border-black/5 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center">
                      <User className="w-4 h-4 text-zinc-500" />
                    </div>
                    <span className="font-semibold text-zinc-900">{post.username}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">
                      {new Date(post.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    {username === post.username && (
                      <div className="flex items-center gap-1">
                        <button 
                          onClick={() => {
                            setEditingPostId(post.id);
                            setEditContent(post.content);
                          }}
                          className="p-1.5 text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-all"
                          title="Edit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => handleDelete(post.id)}
                          className="p-1.5 text-zinc-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {editingPostId === post.id ? (
                  <div className="space-y-3">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full p-3 bg-zinc-50 border border-zinc-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all resize-none"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setEditingPostId(null)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                      <button
                        onClick={() => handleEdit(post.id)}
                        disabled={isLoading || !editContent.trim()}
                        className="flex items-center gap-1.5 bg-black text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-zinc-700 leading-relaxed whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {posts.length === 0 && (
            <div className="text-center py-20">
              <p className="text-zinc-400">No posts yet. Be the first to share something!</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
