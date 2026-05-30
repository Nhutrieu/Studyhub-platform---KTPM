"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { FiAlertTriangle, FiRefreshCw } from "react-icons/fi";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error);
    }, [error]);

    return (
        <div className="min-h-[80vh] flex flex-col items-center justify-center p-4 text-center">
            <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-6">
                <FiAlertTriangle className="w-10 h-10 text-red-500" />
            </div>

            <h2 className="text-2xl font-bold text-secondary-900 mb-2">Đã có lỗi xảy ra!</h2>
            <p className="text-secondary-500 max-w-md mb-8">
                Chúng tôi rất tiếc về sự bất tiện này. Vui lòng thử lại sau giây lát.
            </p>

            <Button
                onClick={reset}
                variant="primary"
                size="lg"
                className="flex items-center gap-2"
            >
                <FiRefreshCw className="w-5 h-5" />
                Thử lại
            </Button>
        </div>
    );
}
