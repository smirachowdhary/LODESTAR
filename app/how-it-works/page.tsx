export default function HowItWorksPage() {
  const steps = [
    {
      number: "01",
      title: "Tell LODESTAR what's happening",
      description:
        "Describe your situation naturally. You don't need to know what program or organization you're looking for.",
    },
    {
      number: "02",
      title: "LODESTAR identifies your needs",
      description:
        "The system breaks your situation into areas such as housing, food, employment, healthcare, legal assistance, or benefits.",
    },
    {
      number: "03",
      title: "Find relevant resources",
      description:
        "LODESTAR searches its verified community-resource database and identifies services that may fit your situation.",
    },
    {
      number: "04",
      title: "Prioritize your options",
      description:
        "Resources are ranked based on factors such as need match, verification, location, accessibility, and urgency.",
    },
    {
      number: "05",
      title: "Get a plan",
      description:
        "Instead of leaving you with a list of links, LODESTAR turns the recommendations into concrete next steps.",
    },
  ];

  return (
    <main className="min-h-screen bg-[#fbfcfa] text-[#173d32]">
      <section className="border-b border-[#e5ebe7] bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#477765]">
            How LODESTAR works
          </p>

          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl">
            Finding help shouldn't require knowing where to look.
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#60766e]">
            LODESTAR turns a complicated situation into a personalized path
            forward — from understanding what you need to finding resources
            and deciding what to do first.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-10">
        <div className="grid gap-6 md:grid-cols-2">
          {steps.map((step) => (
            <article
              key={step.number}
              className="rounded-3xl border border-[#dfe8e3] bg-white p-8"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#edf4ef] text-sm font-semibold text-[#477765]">
                {step.number}
              </div>

              <h2 className="mt-6 text-2xl font-semibold">
                {step.title}
              </h2>

              <p className="mt-4 leading-7 text-[#60766e]">
                {step.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#173d32]">
        <div className="mx-auto max-w-6xl px-6 py-20 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a9c9bc]">
            The goal
          </p>

          <h2 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white">
            Don't just find a resource. Find your next step.
          </h2>

          <p className="mt-6 max-w-2xl text-lg leading-8 text-[#d0dfd9]">
            LODESTAR is designed to reduce the time and uncertainty involved
            in navigating community services, especially when someone is
            already dealing with a difficult situation.
          </p>
        </div>
      </section>
    </main>
  );
}