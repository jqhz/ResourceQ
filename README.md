# ResourceQ

Serves resources, archives resources for MCSR

ResourceQ is a localhost app, not meant to be deployed. ResourceQ is a way for me to manage my Neondb through RESTful API access to GET, PUT, POST, and DELETE resources meant for the MCSR Hub project.

## File Structure

resourceq
|--/public
|--/src
|--/tests

## Tech Stack

NeonDB - PostgreSQL
Next.Js + Typescript
Eslint + Prettier
Drizzle - ORM
MUI - Material UI components

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.