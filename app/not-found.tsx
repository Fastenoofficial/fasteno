import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <section className="mx-auto flex max-w-7xl flex-col items-center px-4 py-32 text-center sm:px-6">
      <p className="eyebrow mb-4">Error 404</p>
      <h1 className="font-display text-5xl text-ivory">
        This page has come undone.
      </h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-muted">
        The page you're looking for doesn't exist or has been moved. Allow us
        to point you somewhere better dressed.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/" variant="primary" size="md">
          Back to Home
        </Button>
        <Button href="/shop" variant="outline" size="md">
          Browse the Collection
        </Button>
      </div>
    </section>
  );
}
