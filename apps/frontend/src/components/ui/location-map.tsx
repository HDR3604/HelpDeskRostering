import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { cn } from '@/lib/utils'

interface LocationMapProps {
    latitude: number
    longitude: number
    /** Help desk location — if provided, shows as a second marker */
    helpDeskLatitude?: number
    helpDeskLongitude?: number
    radiusMeters?: number
    className?: string
}

export function LocationMap({
    latitude,
    longitude,
    helpDeskLatitude,
    helpDeskLongitude,
    radiusMeters = 100,
    className = 'h-48 w-full rounded-lg',
}: LocationMapProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!containerRef.current || mapRef.current) return

        const map = L.map(containerRef.current, {
            zoomControl: false,
            attributionControl: false,
            dragging: false,
            scrollWheelZoom: false,
            doubleClickZoom: false,
            touchZoom: false,
            boxZoom: false,
            keyboard: false,
        })

        // Use CartoDB Voyager for a cleaner, modern look
        const tileLayer = L.tileLayer(
            'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
            { maxZoom: 19 },
        ).addTo(map)

        tileLayer.on('load', () => setLoading(false))

        const hasHelpDesk =
            helpDeskLatitude !== undefined && helpDeskLongitude !== undefined

        // Help desk radius circle + marker
        if (hasHelpDesk) {
            L.circle([helpDeskLatitude, helpDeskLongitude], {
                radius: radiusMeters,
                color: '#6366f1',
                fillColor: '#6366f1',
                fillOpacity: 0.06,
                weight: 1.5,
                dashArray: '6 4',
            }).addTo(map)

            L.circleMarker([helpDeskLatitude, helpDeskLongitude], {
                radius: 5,
                fillColor: '#6366f1',
                fillOpacity: 0.8,
                color: '#fff',
                weight: 1.5,
            }).addTo(map)
        }

        // Clock-in location marker (blue dot with glow ring)
        L.circleMarker([latitude, longitude], {
            radius: 14,
            fillColor: '#3b82f6',
            fillOpacity: 0.15,
            color: '#3b82f6',
            weight: 1,
        }).addTo(map)

        L.circleMarker([latitude, longitude], {
            radius: 6,
            fillColor: '#3b82f6',
            fillOpacity: 1,
            color: '#fff',
            weight: 2.5,
        }).addTo(map)

        // Fit bounds to show both markers, or center on clock-in
        if (hasHelpDesk) {
            const bounds = L.latLngBounds(
                [latitude, longitude],
                [helpDeskLatitude, helpDeskLongitude],
            )
            map.fitBounds(bounds.pad(0.5))
        } else {
            map.setView([latitude, longitude], 16)
        }

        mapRef.current = map
        setTimeout(() => map.invalidateSize(), 0)

        return () => {
            map.remove()
            mapRef.current = null
        }
    }, [latitude, longitude, helpDeskLatitude, helpDeskLongitude, radiusMeters])

    return (
        <div className={cn('relative', className)}>
            <div ref={containerRef} className="absolute inset-0" />
            {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-muted/60">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            )}
        </div>
    )
}
