# TimeSpace

TimeSpace is a React-based productivity tool that visualizes your to-dos on an interactive, zoomable timeline.

## Features

- **Dynamic Zooming**: Seamlessly switch between Hourly, Daily, Weekly, and Monthly views.
- **Visual Scheduling**: View your to-dos as blocks on a time-axis.
- **Easy Navigation**: Quickly jump between dates and zoom levels.
- **Built with**: React, TypeScript, Tailwind CSS, Vite, Radix UI (Lucide Icons), and date-fns.

## Getting Started

### Prerequisites

- Node.js (v20 or newer)
- npm

### Installation

1. Install dependencies:

   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

## Design Principles

- **Clarity**: High contrast and clean typography for better visibility across zoom scales.
- **Context**: Maintains date context whether you are zoomed in to an hour or out to a month.
- **Responsiveness**: Flexible layout that adapts to your scheduling needs.

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
   globalIgnores(["dist"]),
   {
      files: ["**/*.{ts,tsx}"],
      extends: [
         // Other configs...

         // Remove tseslint.configs.recommended and replace with this
         tseslint.configs.recommendedTypeChecked,
         // Alternatively, use this for stricter rules
         tseslint.configs.strictTypeChecked,
         // Optionally, add this for stylistic rules
         tseslint.configs.stylisticTypeChecked,

         // Other configs...
      ],
      languageOptions: {
         parserOptions: {
            project: ["./tsconfig.node.json", "./tsconfig.app.json"],
            tsconfigRootDir: import.meta.dirname,
         },
         // other options...
      },
   },
]);
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
   globalIgnores(["dist"]),
   {
      files: ["**/*.{ts,tsx}"],
      extends: [
         // Other configs...
         // Enable lint rules for React
         reactX.configs["recommended-typescript"],
         // Enable lint rules for React DOM
         reactDom.configs.recommended,
      ],
      languageOptions: {
         parserOptions: {
            project: ["./tsconfig.node.json", "./tsconfig.app.json"],
            tsconfigRootDir: import.meta.dirname,
         },
         // other options...
      },
   },
]);
```
