# CloudDrive - Premium File Uploader

A high-performance, Google Drive-style file uploader application built with Next.js and powered by Hugging Face Datasets as a hidden backend.

## 🚀 Features

- **Blazing Fast**: Uses client-side chunking (4MB) to bypass payload limits and optimize speed.
- **LFS Support**: Implements the full Hugging Face LFS multipart upload workflow for files up to 1GB+.
- **Real-time Metrics**: Beautiful progress cards showing upload speed, size, and estimated time remaining (ETA).
- **Premium UI**: Minimalist, modern interface built with Tailwind CSS v4 and Framer Motion.
- **Secure**: Backend storage is completely hidden from the user.

## 🛠️ Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory and add the following variables:

```env
# Your Hugging Face API Token (must have write access)
HF_TOKEN=hf_your_token_here

# The target Hugging Face Dataset repository ID (format: USERNAME/REPO_NAME)
REPO_ID=your_username/your_dataset_name
```

### 2. Installation

```bash
npm install
```

### 3. Development

```bash
npm run dev
```

### 4. Production Build

```bash
npm run build
```

## 📦 Tech Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS v4, Framer Motion, Lucide React.
- **Backend**: Next.js Route Handlers.
- **API**: Hugging Face Hub LFS API.

## 📝 Note

This application is designed for permanent storage. There is no "Delete" or "Manage" functionality; once a file is uploaded, a permanent shareable link is generated.
