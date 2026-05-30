import { createElement } from "react";
import { cn } from "@/lib/utils";
import { textPresets } from "@/lib/design-system/theme";

interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
    variant?: keyof typeof textPresets;
}

export default function Heading({
    className,
    level = 2,
    variant,
    children,
    ...props
}: HeadingProps) {
    // Map level to default preset if variant not specified
    const defaultVariant = {
        1: "heading1",
        2: "heading2",
        3: "heading3",
        4: "heading3",
        5: "heading3",
        6: "heading3",
    } as const;

    const preset = variant ? textPresets[variant] : textPresets[defaultVariant[level]];

    return createElement(
        `h${level}`,
        {
            className: cn(preset, className),
            ...props,
        },
        children
    );
}
