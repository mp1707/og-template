import {
	NavigationMenu,
	NavigationMenuContent,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	NavigationMenuTrigger,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";

export default function Navbar({className}: {className?: string}) {
	return (
		<NavigationMenu className={className}>
			<NavigationMenuList>
				<NavigationMenuLink className={navigationMenuTriggerStyle()}>
					<button
						type="button"
						className="cursor-pointer"
						onClick={() => alert("HELLO")}
					>
						Login
					</button>
				</NavigationMenuLink>
				<NavigationMenuItem>
					<NavigationMenuTrigger>Dropdown</NavigationMenuTrigger>
					<NavigationMenuContent>
						<NavigationMenuLink>Link</NavigationMenuLink>
						<NavigationMenuLink>Hallo</NavigationMenuLink>
						<NavigationMenuLink>Halo2</NavigationMenuLink>
					</NavigationMenuContent>
				</NavigationMenuItem>
			</NavigationMenuList>
		</NavigationMenu>
	);
}
