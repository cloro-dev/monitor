<div align="center">

  <h3 align="center">AI-Powered Brand Monitoring & Competitor Analysis</h3>

  <p align="center">
    Track your brand's presence across AI models, analyze sentiment, and discover competitors automatically.
  </p>

  <p align="center">
    <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcloro%2Fmonitor&env=DATABASE_URL,BETTER_AUTH_SECRET,NEXT_PUBLIC_APP_URL,CRON_SECRET,OPENAI_API_KEY,GOOGLE_GENERATIVE_AI_API_KEY">
      <img src="https://vercel.com/button" alt="Deploy with Vercel" />
    </a>
  </p>
</div>

## ✨ Features

- 🔍 **Brand Tracking**: Monitor how your brands are mentioned across various AI models.
- 🤖 **Multi-Model Support**: Track responses from ChatGPT, Google Gemini, Perplexity, and more.
- 📊 **AI Analysis**: Automated sentiment analysis, brand positioning, and mention tracking.
- 🕵️‍♂️ **Competitor Discovery**: Automatically identify and track competitors mentioned alongside your brand.
- 📈 **Interactive Dashboard**: Visualize trends, sentiment shifts, and competitive landscape over time.
- ⏱️ **Automated Monitoring**: Scheduled cron jobs keep your data up-to-date 24/7.
- 🔐 **Secure Authentication**: Robust auth system using Better Auth.

## 🛠️ Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router)
- **Database**: [PostgreSQL](https://www.postgresql.org/) with [Prisma](https://www.prisma.io/)
- **Authentication**: [Better Auth](https://better-auth.com/)
- **UI**: [Tailwind CSS](https://tailwindcss.com/), [shadcn/ui](https://ui.shadcn.com/), [Recharts](https://recharts.org/)
- **AI**: [Vercel AI SDK](https://sdk.vercel.ai/) (OpenAI, Google)
- **Deployment**: [Vercel](https://vercel.com/)

## 🚀 Getting Started

Follow these steps to run Monitor locally.

### Prerequisites

- Node.js 18+
- Docker (for local PostgreSQL)
- npm or pnpm

### Installation

1.  **Clone the repository:**

    ```bash
    git clone https://github.com/cloro-dev/monitor.git
    cd monitor
    ```

2.  **Install dependencies:**

    ```bash
    pnpm install
    ```

3.  **Environment Setup:**

    Copy the example environment file and configure your secrets.

    ```bash
    cp .env.example .env
    ```

    **Required Variables:**
    - `DATABASE_URL`: Your PostgreSQL connection string.
    - `BETTER_AUTH_SECRET`: A random secret key for authentication.
    - `NEXT_PUBLIC_APP_URL`: Your app's URL (e.g., `http://localhost:3000`).
    - `CRON_SECRET`: Secret key for securing cron jobs.
    - `OPENAI_API_KEY` or `GOOGLE_GENERATIVE_AI_API_KEY`: For AI analysis.

4.  **Start the Database:**

    Use the provided Docker Compose setup to spin up a local PostgreSQL instance.

    ```bash
    pnpm db:up
    ```

5.  **Database Migration:**

    Push the schema to your database.

    ```bash
    pnpm db:migrate
    ```

6.  **Run the Development Server:**

    ```bash
    pnpm dev
    ```

    Open [http://localhost:3000](http://localhost:3000) to see the app.

## 🔄 Cron Jobs

To enable automated tracking, you need to trigger the cron endpoint.
The endpoint is located at `/api/cron` and requires the `Authorization` header with your `CRON_SECRET`.

Example request:

```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" http://localhost:3000/api/cron
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0](LICENSE).
