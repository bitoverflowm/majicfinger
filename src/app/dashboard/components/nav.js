import Link from "next/link"
import { CircleUser, Package2  } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

const Nav = () => {
  return (
    <div className="absolute top-0 flex h-8 w-full items-center gap-4 border-b bg-background px-4 md:px-6">
        <div className="hidden flex-col gap-6 text-lg font-medium md:flex-row md:items-center md:gap-5 md:text-sm lg:gap-6 pl-16">
            <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
            >
            Dashboard
            </Link>
            <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
            >
            Orders
            </Link>
            <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
            >
            Products
            </Link>
            <Link
            href="#"
            className="text-muted-foreground transition-colors hover:text-foreground"
            >
            Customers
            </Link>
            <Link
            href="#"
            className="text-foreground transition-colors hover:text-foreground"
            >
            Settings
            </Link>
        </div>
        <div className="flex items-center gap-4 ml-auto md:gap-2 lg:gap-4">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="icon" className="rounded-full">
                    <CircleUser className="h-5 w-5" />
                    <span className="sr-only">Toggle user menu</span>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>My Account</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Settings</DropdownMenuItem>
                    <DropdownMenuItem>Support</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>Logout</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    </div>
  )
}

export default Nav;