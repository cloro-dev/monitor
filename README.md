# Monitor

🚀 A monitoring application built with **Next.js 16**, **Better Auth**, **Prisma**, and **shadcn/ui**.

<a href="https://www.buymeacoffee.com/achour" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" style="height: 60px !important;width: 217px !important;" ></a>

## 📌 Features

- ✅ **Next.js 16** with App Router
- ✅ **Better Auth** for authentication
- ✅ **Prisma** for database management (Rust-Free Engine)
- ✅ **shadcn/ui** for UI components
- ✅ **Dashboard** for authenticated users
- ✅ TypeScript support

## 📦 Installation

1. Clone the repository:
   ```sh
   git clone https://github.com/Achour/monitor.git
   cd monitor
   ```
2. Install dependencies:
   ```sh
   npm install
   ```
3. Set up the local database with Docker:
   ```sh
   npm run db:up
   ```

4. Set up environment variables:

   ```sh
   cp .env.example .env.local
   ```

   Fill in the necessary values in the `.env.local` file. For local development, you can use:
   ```
   DATABASE_URL="postgresql://monitor_user:monitor_password@localhost:5438/monitor_db"
   BETTER_AUTH_SECRET="your-secret-key-here"
   BETTER_AUTH_URL="http://localhost:3000"
   ```

5. Set up the database:

   ```sh
   npx prisma migrate dev
   ```

6. Start the development server:
   ```sh
   npm run dev
   ```

## 🐳 Docker Setup

The application includes Docker Compose configuration for easy local development, following the backend repository structure:

- **PostgreSQL**: Database server running on port 5438

To start the services:
```bash
npm run db:up
```

To stop the services:
```bash
npm run db:down
```

To view logs:
```bash
npm run db:logs
```

To reset the database:
```bash
npm run db:reset
```

Database connection details:
- **Host**: localhost
- **Port**: 5438
- **Database**: monitor_db
- **Username**: monitor_user
- **Password**: monitor_password

The Docker configuration is located in `.docker-compose/dev.yaml` to match the backend repository structure.

## 🚀 Usage

- Run `npm run dev` to start the development server.
- Use `npx prisma studio` to manage your database visually.
- Customize authentication using Better Auth settings.

## 🛠️ Tech Stack

- **Next.js 16** - React framework
- **Better Auth** - Authentication
- **Prisma** - Database ORM (Rust-Free Engine)
- **shadcn/ui** - UI components
- **TypeScript** - Type safety

---

Made with ❤️ by [Achour Meguenni](https://github.com/Achour)
