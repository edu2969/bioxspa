export interface IAccessButtonProps {
    key: string;
    href: string;
    icon: React.ReactNode;
    label: string;
    index: number;
    badges?: Array<{
        color: string;
        value: string | number;
        text: string;
    }>;
    warningMessage?: React.ReactNode;
}