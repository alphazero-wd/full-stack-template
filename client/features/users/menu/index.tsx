"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/features/ui/dropdown-menu";
import { LayoutGrid, LogOut, SettingsIcon } from "lucide-react";
import { useLogout } from "@/features/auth/logout";
import Link from "next/link";
import { ProfileAvatar } from "../avatar";
import { User } from "@/features/users/types";
import { API_URL } from "@/constants";

interface UserMenuProps {
  user: User;
}

export const UserMenu = ({ user }: UserMenuProps) => {
  const logout = useLogout();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <ProfileAvatar
          name={user.name}
          avatar={
            !user.avatar?.isLocal
              ? user.avatar?.url
              : `${API_URL}/files/${user.avatar?.id}`
          }
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuGroup>
          <DropdownMenuLabel>{user.name}</DropdownMenuLabel>
          <DropdownMenuLabel className="font-normal text-muted-foreground">
            {user.email}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/">
              <LayoutGrid className="w-5 h-5 text-muted-foreground mr-2" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings">
              <SettingsIcon className="w-5 h-5 text-muted-foreground mr-2" />
              Settings
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={logout}>
            <LogOut className="w-5 h-5 text-muted-foreground mr-2" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
