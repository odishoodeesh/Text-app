# Testing Instructions

This directory contains files to help you test the TextPost application.

## 1. Manual API Testing
You can test the backend API endpoints by running the following command in your terminal:

```bash
node tests/manual_test.js
```

**Note:** Ensure the development server is running (`npm run dev`) before executing this script.

## 2. Dummy Data
The `dummy_posts.json` file contains example post data that you can use to manually test the "Post" functionality in the UI by copying and pasting the content.

## 3. Edge Config
The `/welcome` endpoint tests your Vercel Edge Config integration. If you haven't set the `EDGE_CONFIG` environment variable yet, this test will likely return an error or null, which is expected.
