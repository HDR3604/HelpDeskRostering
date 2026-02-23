import * as React from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import PhoneInput from 'react-phone-number-input'
import 'react-phone-number-input/style.css'

export interface PhoneInputProps
    extends Omit<React.ComponentProps<'input'>, 'onChange' | 'value'> {
    value?: string
    onChange?: (value: string | undefined) => void
}

/**
 * Phone input with country selector, wrapping the react-phone-number-input
 * library and styled to match shadcn/ui Input.
 */
const PhoneNumberInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
    ({ className, value, onChange, ...props }, _ref) => {
        return (
            <PhoneInput
                international
                defaultCountry="TT"
                value={value}
                onChange={(val) => onChange?.(val ?? '')}
                inputComponent={Input}
                className={cn(
                    '[&_.PhoneInputCountry]:mr-2 [&_.PhoneInputCountry]:pl-3',
                    '[&_.PhoneInputCountryIcon]:size-5',
                    '[&_.PhoneInputCountrySelectArrow]:ml-1',
                    '[&_.PhoneInputCountrySelect]:text-foreground',
                    '[&_.PhoneInputCountrySelect]:bg-background',
                    '[&_.PhoneInputCountrySelect_option]:text-foreground',
                    '[&_.PhoneInputCountrySelect_option]:bg-background',
                    className
                )}
                {...props}
            />
        )
    }
)
PhoneNumberInput.displayName = 'PhoneNumberInput'

export { PhoneNumberInput }
