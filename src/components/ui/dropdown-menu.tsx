"use client"

import * as React from "react"
import { Menu as MenuPrimitive } from "@base-ui/react/menu"
import { CheckIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"

const DropdownMenu = MenuPrimitive.Root
const DropdownMenuTrigger = MenuPrimitive.Trigger
const DropdownMenuGroup = MenuPrimitive.Group
const DropdownMenuPortal = MenuPrimitive.Portal
const DropdownMenuSub = MenuPrimitive.SubmenuRoot
const DropdownMenuRadioGroup = MenuPrimitive.RadioGroup

function DropdownMenuSubTrigger({
  className,
  children,
  ...props
}: MenuPrimitive.SubmenuTrigger.Props) {
  return (
    <MenuPrimitive.SubmenuTrigger
      data-slot="dropdown-menu-sub-trigger"
      className={cn(
        "flex cursor-default select-none items-center rounded-[1px] px-2 py-1 text-[11px] outline-hidden data-highlighted:bg-muted data-highlighted:text-foreground",
        className
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ml-auto size-3" />
    </MenuPrimitive.SubmenuTrigger>
  )
}

function DropdownMenuSubContent({
  className,
  ...props
}: MenuPrimitive.Popup.Props) {
  return (
    <MenuPrimitive.Positioner className="isolate z-50">
      <MenuPrimitive.Popup
        data-slot="dropdown-menu-sub-content"
        className={cn(
          "min-w-32 overflow-hidden rounded-[2px] border border-border bg-popover p-1 text-[11px] text-popover-foreground shadow-xs",
          className
        )}
        {...props}
      />
    </MenuPrimitive.Positioner>
  )
}

function DropdownMenuContent({
  className,
  children,
  side = "bottom",
  sideOffset = 4,
  align = "end",
  ...props
}: MenuPrimitive.Popup.Props & {
  side?: "top" | "bottom" | "left" | "right" | "inline-start" | "inline-end"
  sideOffset?: number
  align?: "start" | "center" | "end"
}) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        className="isolate z-50"
      >
        <MenuPrimitive.Popup
          data-slot="dropdown-menu-content"
          className={cn(
            "min-w-32 overflow-hidden rounded-[2px] border border-border bg-popover p-1 text-[11px] text-popover-foreground shadow-xs transition-all",
            className
          )}
          {...props}
        >
          {children}
        </MenuPrimitive.Popup>
      </MenuPrimitive.Positioner>
    </MenuPrimitive.Portal>
  )
}

function DropdownMenuItem({
  className,
  ...props
}: MenuPrimitive.Item.Props) {
  return (
    <MenuPrimitive.Item
      data-slot="dropdown-menu-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-[1px] px-2 py-1 text-[11px] outline-hidden transition-colors data-highlighted:bg-muted data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
}

function DropdownMenuCheckboxItem({
  className,
  children,
  ...props
}: MenuPrimitive.CheckboxItem.Props) {
  return (
    <MenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-[1px] py-1 pr-2 pl-6 text-[11px] outline-hidden data-highlighted:bg-muted data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <MenuPrimitive.CheckboxItemIndicator className="absolute left-1 flex size-3.5 items-center justify-center">
        <CheckIcon className="size-3" />
      </MenuPrimitive.CheckboxItemIndicator>
      {children}
    </MenuPrimitive.CheckboxItem>
  )
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: MenuPrimitive.RadioItem.Props) {
  return (
    <MenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(
        "relative flex cursor-default select-none items-center rounded-[1px] py-1 pr-2 pl-6 text-[11px] outline-hidden data-highlighted:bg-muted data-highlighted:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <MenuPrimitive.RadioItemIndicator className="absolute left-1 flex size-3.5 items-center justify-center">
        <CheckIcon className="size-3" />
      </MenuPrimitive.RadioItemIndicator>
      {children}
    </MenuPrimitive.RadioItem>
  )
}

function DropdownMenuLabel({
  className,
  ...props
}: MenuPrimitive.GroupLabel.Props) {
  return (
    <MenuPrimitive.GroupLabel
      data-slot="dropdown-menu-label"
      className={cn("px-2 py-1 text-[10px] font-mono text-muted-foreground", className)}
      {...props}
    />
  )
}

function DropdownMenuSeparator({
  className,
  ...props
}: MenuPrimitive.Separator.Props) {
  return (
    <MenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn("-mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
}
