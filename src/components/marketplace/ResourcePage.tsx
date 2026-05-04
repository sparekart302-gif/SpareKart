import { Link } from "@/components/navigation/Link";
import type { ResourcePageContent } from "@/content/resource-pages";
import { Breadcrumbs, PageLayout } from "./PageLayout";

function sectionId(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function ResourcePage({ content }: { content: ResourcePageContent }) {
  return (
    <PageLayout>
      <div className="container mx-auto px-4">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: content.breadcrumbLabel }]} />
      </div>

      <section className="container mx-auto px-4 pb-10 sm:pb-12 md:pb-16">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-8">
          <div className="min-w-0">
            <div className="rounded-[28px] gradient-surface p-6 shadow-[var(--shadow-premium)] sm:p-8">
              <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent">
                {content.eyebrow}
              </div>
              <h1 className="mt-2 text-[2rem] font-black tracking-tight sm:text-3xl md:text-5xl">
                {content.title}
              </h1>
              <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
                {content.description}
              </p>
              <div className="mt-4 inline-flex rounded-full bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-[var(--shadow-soft)]">
                {content.updatedLabel}
              </div>
            </div>

            <div className="mt-6 space-y-4 sm:mt-8 sm:space-y-5">
              {content.sections.map((section) => (
                <article
                  key={section.title}
                  id={sectionId(section.title)}
                  className="rounded-[24px] bg-card p-5 shadow-[var(--shadow-soft)] sm:p-6"
                >
                  <h2 className="text-xl font-black tracking-tight sm:text-2xl">{section.title}</h2>

                  {section.paragraphs?.map((paragraph) => (
                    <p
                      key={paragraph}
                      className="mt-3 text-sm leading-7 text-muted-foreground sm:text-[15px]"
                    >
                      {paragraph}
                    </p>
                  ))}

                  {section.bullets?.length ? (
                    <ul className="mt-4 space-y-2.5 text-sm leading-6 text-muted-foreground sm:text-[15px]">
                      {section.bullets.map((bullet) => (
                        <li key={bullet} className="flex gap-3">
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-accent" />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {section.note ? (
                    <div className="mt-4 rounded-2xl bg-surface px-4 py-3 text-sm font-medium text-foreground shadow-[var(--shadow-soft)]">
                      {section.note}
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>

          <aside className="min-w-0">
            <div className="lg:sticky lg:top-28">
              <div className="rounded-[24px] bg-card p-5 shadow-[var(--shadow-premium)] sm:p-6">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                  On this page
                </div>
                <div className="mt-4 space-y-2">
                  {content.sections.map((section, index) => (
                    <a
                      key={section.title}
                      href={`#${sectionId(section.title)}`}
                      className="flex items-start gap-3 rounded-2xl bg-surface px-3 py-3 text-sm transition-colors hover:bg-accent-soft hover:text-accent"
                    >
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-card text-[11px] font-bold text-muted-foreground shadow-[var(--shadow-soft)]">
                        {index + 1}
                      </span>
                      <span className="font-semibold text-foreground">{section.title}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className="mt-4 rounded-[24px] gradient-hero p-5 text-primary-foreground shadow-[var(--shadow-premium)] sm:p-6">
                <div className="text-xs font-bold uppercase tracking-[0.22em] text-accent/90">
                  Support
                </div>
                <h2 className="mt-2 text-xl font-black tracking-tight">{content.supportTitle}</h2>
                <p className="mt-3 text-sm leading-6 text-primary-foreground/82">
                  {content.supportBody}
                </p>
                <div className="mt-5 space-y-2.5">
                  {content.supportActions.map((action) => (
                    <Link
                      key={action.to}
                      to={action.to}
                      className="block rounded-2xl bg-white/10 px-4 py-3 transition-colors hover:bg-white/15"
                    >
                      <div className="text-sm font-semibold text-primary-foreground">
                        {action.label}
                      </div>
                      {action.description ? (
                        <div className="mt-1 text-xs text-primary-foreground/72">
                          {action.description}
                        </div>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </PageLayout>
  );
}
