# ResourceQ

Serves resources, archives resources for MCSR

ResourceQ is a localhost app, not meant to be deployed. ResourceQ is a way for me to manage my Neondb through RESTful API access to GET, PUT, POST, and DELETE resources meant for the [MCSR Hub](https://mcsrhub.vercel.app/) project.

## Features

- Manage existing cards through the UI interface. This includes Adding, Editing, and Deleting existing cards with filters allowing for easy access to specific cards.

- Queued cards yet to be added to the main database so planned to add.


## File Structure

resourceq

```
|--/public
|--/src
    |--/app
        |--/api
    |--/components
    |--/styles
    |--/utils
|--/tests
```

## Tech Stack

NeonDB - PostgreSQL

Next.Js + Typescript

Eslint + Prettier

Drizzle - ORM

MUI - Material UI components

Jest - Testing

## Dependencies

jest, mui, drizzle, eslint, prettier, neondb, dotenv, react, react hook form, zod, trpc

```
npm install react react-dom @mui/material @emotion/react @emotion/styled drizzle-orm dotenv react-hook-form zod @trpc/client @trpc/server @trpc/react-query @neondatabase/serverless
npm install -D jest eslint prettier drizzle-kit @types/react @types/react-dom @types/jest
```

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