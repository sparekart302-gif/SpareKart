import { PageLayout } from "@/components/marketplace/PageLayout";
import { Link } from "@/components/navigation/Link";

export default function NotFound() {
  return (
    <PageLayout>
      <div className="container mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-black tracking-tight text-foreground">404</h1>
        <h2 className="mt-4 text-2xl font-bold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you&apos;re looking for doesn&apos;t exist or may have moved.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary-hover"
        >
          Back to home
        </Link>
      </div>
    </PageLayout>
  );
}
