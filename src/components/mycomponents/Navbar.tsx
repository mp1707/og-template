import AuthButton from "@/components/mycomponents/AuthButton";
import {
	NavigationMenu,
	NavigationMenuItem,
	NavigationMenuLink,
	NavigationMenuList,
	navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { createClient } from "@/lib/supabase/client";

export default async function Navbar() {
	const supabase = createClient();

	const {
		data: { user },
	} = await supabase.auth.getUser();

	return (
		<>
			<NavigationMenu className="self-end">
				<NavigationMenuList className="flex items-center justify-between">
					<NavigationMenuItem>
						<AuthButton initialUser={user} />
					</NavigationMenuItem>
				</NavigationMenuList>
				<NavigationMenuList className="flex items-center justify-between">
					<NavigationMenuItem>
						<NavigationMenuLink
							className={navigationMenuTriggerStyle()}
							href="/"
						>
							Home
						</NavigationMenuLink>
					</NavigationMenuItem>
				</NavigationMenuList>
			</NavigationMenu>
		</>
	);
}
