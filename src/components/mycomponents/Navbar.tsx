"use client";

import { Button } from "@/components/ui/button";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export default function Navbar({ className }: { className?: string }) {
	return (
		<NavigationMenu className={className}>
			<NavigationMenuList>
				<NavigationMenuItem>
					<NavigationMenuLink href="/" className={navigationMenuTriggerStyle()}>
						Start
					</NavigationMenuLink>
				</NavigationMenuItem>
				<NavigationMenuItem>
					<NavigationMenuLink
						href="/auth/login"
						className={navigationMenuTriggerStyle()}
					>
						Login
					</NavigationMenuLink>
				</NavigationMenuItem>
			</NavigationMenuList>
			{/* <NavigationMenuLink asChild className={navigationMenuTriggerStyle()}>
				<Link href="/auth/login">Login</Link>
			</NavigationMenuLink>
			<NavigationMenuItem>
				<NavigationMenuTrigger>Dropdown</NavigationMenuTrigger>
				<NavigationMenuContent>
					<NavigationMenuLink>Link</NavigationMenuLink>
					<NavigationMenuLink>Hallo</NavigationMenuLink>
					<NavigationMenuLink>Halo2</NavigationMenuLink>
				</NavigationMenuContent>
			</NavigationMenuItem> */}
		</NavigationMenu>
	);
}
