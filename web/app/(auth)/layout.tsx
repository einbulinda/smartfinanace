import Image from 'next/image'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/SmartFinance/Website_Logo-remove-bg-io.png"
            alt="SmartFinance"
            width={220}
            height={74}
            priority
            className="object-contain"
          />
          <p className="text-gray-500 mt-2 text-sm">Smarter choices. Better futures.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
