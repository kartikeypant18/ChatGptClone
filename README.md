## ChatGPT Clone

An open-source ChatGPT clone built with Next.js, TypeScript, Tailwind CSS, and MongoDB. This project demonstrates a modern chat application with authentication, chat history, and AI-powered responses.

### Features

- Chat interface with real-time messaging
- User authentication (sign up/sign in)
- Chat history stored in MongoDB
- Responsive design for mobile and desktop
- Integration with gemini API

### Tech Stack

- Next.js
- React
- TypeScript
- Tailwind CSS
- MongoDB

### Getting Started

1. **Clone the repository:**

   git clone https://github.com/kartikeypant18/ChatGptClone.git
   cd ChatGptClone

2. **Install dependencies:**

   npm install

3. **Set up environment variables:**

   - Create a `.env.local` file in the root directory.
   - Add the following environment variables:
     GEMINI_API_KEY=
     APP_NAME=nextjs-tailwindcss-chatgpt-clone
     NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
     CLERK_SECRET_KEY=
     MONGODB_URI=
     MONGODB_DB=
     CLOUDINARY_URL=
     NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=
     NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=
     NEXT_PUBLIC_UPLOADCARE_PUBLIC_KEY=

     ```

     ```

4. **Run the development server:**

   npm run dev

5. **Open [http://localhost:3000](http://localhost:3000) in your browser.**

### Usage

- Sign up or sign in to start chatting.
- Your chat history is saved and can be accessed anytime.
