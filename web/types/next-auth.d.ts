import { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      proxyWallet?: string
    } & DefaultSession["user"]
  }

  interface User {
    id?: string
    proxyWallet?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    proxyWallet?: string
  }
}