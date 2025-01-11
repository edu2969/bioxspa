import { Roboto, Red_Hat_Display } from 'next/font/google'

export const roboto_init = Roboto({
    subsets: ['latin'],
    weight: "400",
    display: 'swap',
    variable: '--font-roboto'
});

export const roboto = roboto_init.variable;

export const red_hat_display_init = Red_Hat_Display({
    subsets: ['latin'],
    weight: "400",
    display: 'swap',
    variable: '--font-red-hat-display'
});

export const red_hat_display = red_hat_display_init.variable;