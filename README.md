LODESTAR

AI-powered civic navigation that helps people find relevant community
resources, understand what to do next, and follow through on a
personalized action plan.

Live App: https://lodestar-livid.vercel.app/

Overview

Finding public and community assistance can be overwhelming. People may
know they need help with food, housing, transportation, employment,
healthcare, legal services, or benefits without knowing which programs
to search for or what steps to take first.

LODESTAR turns a user's situation, written in their own words, into a
clearer path forward. It identifies the user's needs, detects location
and relevant eligibility context, prioritizes verified resources, and
creates an actionable plan.

Rather than functioning as another directory of links, LODESTAR is
designed to answer a more useful question:

Given my situation, where should I start?

Key Features

Natural-language needs analysis --- users describe their
situation instead of navigating complicated program categories.

Location-aware recommendations --- city and county matches are
prioritized when location information is available.

Eligibility-aware ranking --- relevant context such as senior,
veteran, youth, disability, and family status can improve
recommendations.

Verified resource database --- community and government
resources are stored with structured information such as services,
eligibility, location, contact information, and verification status.

Personalized action plans --- LODESTAR converts identified needs
into concrete next steps.

Saved progress --- authenticated users can save plans, complete
action steps, return later, and continue where they left off.

Resource discovery system --- an admin workflow can scan trusted
resource pages, extract structured information, and add useful
services to the resource database.

Graceful location fallback --- users can still receive statewide
options without providing a location and are prompted to add a city
or ZIP for more local results.

Responsive interface --- designed for both desktop and mobile
use.

How It Works

Describe the situation
A user explains what is happening in plain language, for example:
"I'm a senior in Redmond and need help paying for food and
transportation."

Identify needs and context
LODESTAR analyzes the request to identify needs such as food or
transportation, detect available location information, and recognize
relevant user context.

Rank relevant resources
Resources are scored using factors including need match, geographic
relevance, verification status, and specialized-audience relevance.
Irrelevant specialized resources are penalized and duplicate
organizations are filtered.

Create an action plan
The user receives prioritized recommendations alongside clear next
steps.

Save and continue
Signed-in users can save their plan, mark steps complete, view
progress from their dashboard, and reopen the plan later.

Example Use Cases

A family behind on rent that also needs food assistance.

A senior looking for transportation and meal support.

Someone who recently lost a job and needs employment and benefits
resources.

A resident who knows they need help but does not know which
government or nonprofit program to contact.

Tech Stack

Technology                          Purpose

Next.js                         Full-stack web application

React                           User interface

TypeScript                      Application logic and type safety

Tailwind CSS                    Responsive styling

Supabase                        Authentication, PostgreSQL
database, and persisted plans

Groq API                        AI-assisted resource extraction
during resource discovery

Jina Reader                     Reading trusted public resource
pages for ingestion

Vercel                          Deployment and hosting

Architecture

                         ┌─────────────────────┐
                         │        User         │
                         └──────────┬──────────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Next.js / React   │
                         │      Frontend       │
                         └──────────┬──────────┘
                                    │
                          Situation / location
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   Analyze API Route │
                         │                     │
                         │ • Need detection    │
                         │ • Location matching │
                         │ • Audience context  │
                         │ • Resource ranking  │
                         │ • Action planning   │
                         └───────┬──────┬──────┘
                                 │      │
                    resources    │      │ plans/auth
                                 ▼      ▼
                         ┌─────────────────────┐
                         │      Supabase       │
                         │                     │
                         │ • resources         │
                         │ • plans             │
                         │ • authentication    │
                         └─────────────────────┘

 Admin Resource Discovery
          │
          ▼
 ┌───────────────────┐      ┌──────────────┐
 │ Trusted Web Pages │ ───► │ Jina Reader  │
 └───────────────────┘      └──────┬───────┘
                                   ▼
                            ┌──────────────┐
                            │  Groq API    │
                            │ extraction   │
                            └──────┬───────┘
                                   ▼
                            ┌──────────────┐
                            │  resources   │
                            │   database   │
                            └──────────────┘

Recommendation Logic

LODESTAR does more than keyword matching. The recommendation pipeline
considers:

Whether a resource matches one or more detected needs.

Whether it serves the user's city, county, or the entire state.

Whether the resource is verified.

Whether it is intended for a specialized audience relevant to the
user.

Whether a specialized resource would be inappropriate for the
current user.

Duplicate organizations that should not occupy multiple
recommendation slots.

This allows a resource designed specifically for seniors in King County,
for example, to rank above a generic statewide directory when the user's
situation indicates that it is a better match.

Resource Discovery

LODESTAR includes an administrative resource-ingestion workflow to make
the resource database easier to maintain and expand.

The workflow can:

Read a trusted public resource page.

Extract structured information from the page.

Normalize resource categories and fields.

Store useful resource information in Supabase.

Make the new resource available to the recommendation engine.

The goal is to support a resource system that can grow without manually
entering every organization one field at a time.

Authentication & Persistence

LODESTAR uses Supabase Authentication. Signed-in users can:

Save personalized plans.

Track completed action steps.

View saved plans from a dashboard.

Reopen a previous plan.

Continue progress across sessions.

Delete plans they no longer need.

Database Row Level Security policies restrict plan access to the
authenticated user who owns each plan.

Running Locally

Prerequisites

Node.js

npm

A Supabase project

A Groq API key if using the administrative resource-discovery
workflow

Setup

git clone <YOUR-GITHUB-REPOSITORY-URL>
cd bridge-ai
npm install

Create .env.local:

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
GROQ_API_KEY=your_groq_api_key

Then run:

npm run dev

Open http://localhost:3000.

Never commit .env.local or secret API keys to the repository.

Current Scope

LODESTAR currently focuses on Washington State. The architecture is
designed so additional locations and resource datasets can be added as
the project grows.

Resource availability and eligibility can change. LODESTAR helps users
navigate community resources, but users should confirm current details
directly with the relevant organization before relying on a service.

Future Improvements

Expand verified resource coverage beyond Washington.

Improve local resource coverage at the city and county level.

Add multilingual navigation.

Add richer resource verification and provenance information.

Continue improving recommendation explanations and accessibility.

Explore optional follow-up tools that help users stay on track after
receiving a plan.

Author

Smira Chowdhary

LODESTAR --- Find the help you need. Know what to do next.
