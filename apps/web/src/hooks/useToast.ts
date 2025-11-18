import { useCallback } from 'react';
import { TOAST_CONFIG, type ToastType } from '@b2b-plus/shared';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
    duration: number;
}

type ToastContextType = {
    toasts: Toast[];
    addToast: (message: string, type: ToastType, duration?: number) => string;
    removeToast: (id: string) => void;
};

/**
 * Hook for managing toast notifications
 * Auto-dismisses based on toast type
 */
export function useToast() {
    // This would typically be used with a Toast context or state management
    // For now, providing the interface

    const addToast = useCallback(
        (message: string, type: ToastType = 'info', duration?: number) => {
            const id = Math.random().toString(36).substring(7);
            const config = TOAST_CONFIG[type];
            const finalDuration = duration ?? config.duration;

            // Dispatch toast addition event
            const event = new CustomEvent('toast:add', {
                detail: { id, message, type, duration: finalDuration },
            });
            window.dispatchEvent(event);

            // Auto-dismiss if duration > 0
            if (finalDuration > 0) {
                setTimeout(() => {
                    removeToast(id);
                }, finalDuration);
            }

            return id;
        },
        []
    );

    const removeToast = useCallback((id: string) => {
        const event = new CustomEvent('toast:remove', {
            detail: { id },
        });
        window.dispatchEvent(event);
    }, []);

    return {
        success: (message: string, duration?: number) =>
            addToast(message, 'success', duration),
        error: (message: string, duration?: number) =>
            addToast(message, 'error', duration),
        warning: (message: string, duration?: number) =>
            addToast(message, 'warning', duration),
        info: (message: string, duration?: number) =>
            addToast(message, 'info', duration),
        removeToast,
    };
}
