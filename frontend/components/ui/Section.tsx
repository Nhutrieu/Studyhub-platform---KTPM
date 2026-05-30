import { cn } from "@/lib/utils";
import { sectionSpacing } from "@/lib/design-system/theme";
import PageShell from "@/components/layouts/PageShell";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
    container?: boolean;
    size?: keyof typeof sectionSpacing;
    background?: "white" | "stone" | "transparent";
}

export default function Section({
    className,
    container = true,
    size = "md",
    background = "transparent",
    children,
    ...props
}: SectionProps) {
    const bgClasses = {
        white: "bg-white",
        stone: "bg-secondary-50",
        transparent: "bg-transparent",
    };

    const content = container ? (
        <PageShell>
            {children}
        </PageShell>
    ) : (
        children
    );

    return (
        <section
            className={cn(
                sectionSpacing[size],
                bgClasses[background],
                className
            )}
            {...props}
        >
            {content}
        </section>
    );
}
