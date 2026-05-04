import { Printer } from "lucide-react";
import { ADMIN_COLORS } from "../../utils/colors";

interface LoadingStateProps {
  message?: string;
}

export default function LoadingState({ message = "Loading" }: LoadingStateProps) {
  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <div className="text-center">
        {/* SpeedCopy Animated Loader */}
        <div className="relative mx-auto mb-6 h-20 w-64">
          {/* Animated Printer Icon */}
          <div className="absolute left-0 top-1/2 -translate-y-1/2 animate-pulse">
            <div 
              className="rounded-xl p-2.5 shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${ADMIN_COLORS.primary} 0%, ${ADMIN_COLORS.primaryLight} 100%)` 
              }}
            >
              <Printer size={32} className="text-white" />
            </div>
          </div>
          
          {/* Dashed Line Path */}
          <div 
            className="absolute left-14 right-14 top-1/2 -translate-y-1/2 border-t-2 border-dashed"
            style={{ borderColor: ADMIN_COLORS.gray300 }}
          ></div>
          
          {/* Animated Package Moving */}
          <div className="absolute left-14 top-1/2 -translate-y-1/2 animate-[movePackage_2s_ease-in-out_infinite]">
            <div 
              className="flex h-7 w-7 items-center justify-center rounded-lg text-white shadow-md"
              style={{ backgroundColor: ADMIN_COLORS.accent }}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          
          {/* Destination Icon */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <div 
              className="rounded-xl p-2.5 shadow-lg"
              style={{ 
                background: `linear-gradient(135deg, ${ADMIN_COLORS.success} 0%, ${ADMIN_COLORS.successLight} 100%)` 
              }}
            >
              <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Loading text */}
        <p className="text-base font-bold" style={{ color: ADMIN_COLORS.gray800 }}>
          {message}<span className="loading-dots"></span>
        </p>
        <p className="mt-1 text-xl font-black" style={{ color: ADMIN_COLORS.primary }}>SpeedCopy</p>
        <p className="mt-0.5 text-xs" style={{ color: ADMIN_COLORS.gray500 }}>Fast Printing & Delivery Service</p>
      </div>
    </div>
  );
}
