export async function GET() {
    // Return a simple page instead of redirecting.
    // The Electron main process detects navigation to this URL via did-navigate
    // and reloads the app at the auth-callback route.
    return new Response(
        "<html><body><p>Login successful. Returning to app...</p></body></html>",
        { headers: { "Content-Type": "text/html" } }
    );
}
