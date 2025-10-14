// /api/get-key.ts

// Vercel automatically handles the request and response objects for serverless functions.
// This function will be accessible at your domain, e.g., https://your-app.vercel.app/api/get-key
export default function handler(request, response) {
  // This code runs on the server, so it has secure access to environment variables.
  const apiKey = process.env.API_KEY;

  if (apiKey) {
    // If the key is found, send it back to the frontend.
    response.status(200).json({ apiKey: apiKey });
  } else {
    // If the key is not found on the server, send an error.
    response.status(500).json({ error: "The 'API_KEY' environment variable is not set on the Vercel server." });
  }
}