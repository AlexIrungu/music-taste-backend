const SCOPES = [
  "user-top-read",
  "user-read-recently-played",
  "user-read-private",
  "user-read-email",
  "streaming",
].join(" ")

function getSpotifyAuthUrl() {
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID!,
    response_type: "code",
    redirect_uri: process.env.NEXT_PUBLIC_SPOTIFY_REDIRECT_URI!,
    scope: SCOPES,
    show_dialog: "true",
  })
  return `https://accounts.spotify.com/authorize?${params.toString()}`
}

export default function Home() {
  const authUrl = getSpotifyAuthUrl()

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center px-6">
      <div className="text-center max-w-xl">
        <p className="text-pink-500 text-xs font-mono uppercase tracking-widest mb-6">
          Project 01
        </p>
        <h1 className="text-6xl font-bold tracking-tight mb-4">
          Music Taste DNA
        </h1>
        <p className="text-gray-400 text-lg leading-relaxed mb-10">
          Discover your audio fingerprint — who you are as a listener, what
          your music says about you, and how you compare to others.
        </p>
        <a
          href={authUrl}
          className="inline-block bg-green-500 hover:bg-green-400 text-black font-semibold px-8 py-4 rounded-full transition-colors text-base"
        >
          Connect with Spotify
        </a>
        <p className="text-gray-600 text-xs mt-6">
          We only read your listening history. We never modify your library.
        </p>
      </div>
    </main>
  )
}
