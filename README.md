# Geographic Mapping Tool

A modern web-based geographic mapping and annotation tool built with Next.js. This application provides an intuitive interface for creating, managing, and visualizing spatial data through an interactive map interface.

## Features

- **Interactive Map Interface**
  - Add points, lines, and polygons
  - Select and modify existing features
  - Delete features as needed

- **Feature Management**
  - Sidebar display of all added features
  - Visual indicators for different feature types
  - Feature naming and description support
  - Easy selection and deletion of features

- **Modern UI/UX**
  - Clean, responsive design
  - Intuitive feature management
  - Real-time updates
  - Smooth interactions

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

## Project Structure

- `src/components/map/` - Map-related components
  - `MapSidebar.tsx` - Feature management sidebar
  - Other map components...

- `src/app/` - Next.js app directory
  - `page.tsx` - Main application page

## Technology Stack

- [Next.js](https://nextjs.org) - React framework
- [shadcn/ui](https://ui.shadcn.com) - UI component library
- [Geist](https://vercel.com/font) - Font family
- Map library (TBD)

## Learn More

To learn more about the technologies used in this project:

- [Next.js Documentation](https://nextjs.org/docs)
- [Learn Next.js](https://nextjs.org/learn)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)

## Deployment

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
