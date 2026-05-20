export default function VerifyPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col justify-center p-8 max-w-md mx-auto text-center">
      <div className="text-6xl mb-6">📬</div>
      <h1 className="font-heading text-3xl font-semibold text-dark mb-4">Check your email</h1>
      <p className="text-mid text-xl">
        We sent a sign-in link to your email. Tap it to continue.
      </p>
      <p className="text-muted text-base mt-6">You can close this tab.</p>
    </div>
  );
}
