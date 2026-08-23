export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#fbfcfa] text-[#173d32]">
      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-6 py-24 lg:px-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#477765]">
            About LODESTAR
          </p>

          <h1 className="mt-5 max-w-4xl text-5xl font-semibold tracking-tight sm:text-6xl">
            Civic technology built around people, not paperwork.
          </h1>

          <p className="mt-7 max-w-3xl text-lg leading-8 text-[#60766e]">
            Community resources exist everywhere, but finding the right one
            can be surprisingly difficult. Information is fragmented across
            government websites, nonprofit directories, and local
            organizations.
          </p>

          <p className="mt-5 max-w-3xl text-lg leading-8 text-[#60766e]">
            LODESTAR is being built to bridge that gap. Instead of asking
            people to figure out the system themselves, LODESTAR starts with
            their situation and works backward toward practical next steps.
          </p>
        </div>
      </section>

      <section className="border-y border-[#e5ebe7]">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 md:grid-cols-3 lg:px-10">
          <div>
            <h2 className="text-xl font-semibold">Understand</h2>
            <p className="mt-3 leading-7 text-[#60766e]">
              Translate a person's situation into the different kinds of help
              they may need.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Connect</h2>
            <p className="mt-3 leading-7 text-[#60766e]">
              Match people with relevant community organizations and public
              programs.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold">Act</h2>
            <p className="mt-3 leading-7 text-[#60766e]">
              Turn recommendations into clear, prioritized actions.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 lg:px-10">
        <div className="rounded-3xl bg-[#edf4ef] p-8 sm:p-12">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#477765]">
            Built in Washington
          </p>

          <h2 className="mt-4 text-3xl font-semibold">
            Starting local. Building toward something bigger.
          </h2>

          <p className="mt-5 max-w-2xl leading-8 text-[#60766e]">
            LODESTAR currently focuses on Washington resources while its
            underlying platform is being developed to support communities
            across the United States.
          </p>
        </div>
      </section>
    </main>
  );
}