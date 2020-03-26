import {
  FitBoundsOptions,
  LatLngBoundsExpression,
  Map,
  MapOptions,
} from 'leaflet'
import React, {
  CSSProperties,
  MutableRefObject,
  ReactNode,
  Ref,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'

import { LeafletProvider } from './core/context'
import { EventedProps, useLeafletEvents } from './core/events'

export interface MapProps extends MapOptions, EventedProps {
  animate?: boolean
  bounds?: LatLngBoundsExpression
  boundsOptions?: FitBoundsOptions
  children?: ReactNode
  className?: string
  id?: string
  style?: CSSProperties
  useFlyTo?: boolean
  whenCreated?: (map: Map) => void
  whenReady?: () => void
}

export function useMapElement(
  mapRef: MutableRefObject<HTMLElement | null>,
  props: MapProps,
): Map | null {
  const propsRef = useRef<MapProps>(props)
  const [map, setMap] = useState<Map | null>(null)

  useLeafletEvents(map ? { instance: map } : null, props.eventHandlers)
  useEffect(() => {
    if (mapRef.current === null) {
      // Wait for map container to be rendered
      return
    }
    if (map === null) {
      const instance = new Map(mapRef.current, props)
      if (props.center != null && props.zoom != null) {
        instance.setView(props.center, props.zoom)
      } else if (props.bounds != null) {
        instance.fitBounds(props.bounds)
      }
      if (props.whenReady != null) {
        instance.whenReady(props.whenReady)
      }
      setMap(instance)
    } else if (propsRef.current !== null) {
      if (
        props.center != null &&
        props.zoom != null &&
        (props.center !== propsRef.current.center ||
          props.zoom !== propsRef.current.zoom)
      ) {
        const opts = { animate: props.animate ?? false }
        if (props.useFlyTo === true) {
          map.flyTo(props.center, props.zoom, opts)
        } else {
          map.setView(props.center, props.zoom, opts)
        }
      }

      if (props.bounds != null && props.bounds !== propsRef.current.bounds) {
        if (props.useFlyTo) {
          map.flyToBounds(props.bounds, props.boundsOptions)
        } else {
          map.fitBounds(props.bounds, props.boundsOptions)
        }
      }

      if (
        props.whenReady != null &&
        props.whenReady !== propsRef.current.whenReady
      ) {
        map.whenReady(props.whenReady)
      }
    }
    propsRef.current = props
  }, [mapRef, map, props])

  return map
}

function MapComponent(
  { children, className, id, style, whenCreated, ...options }: MapProps,
  ref: Ref<{ element: Map | null }>,
) {
  const mapRef = useRef<HTMLDivElement>(null)
  const map = useMapElement(mapRef, options)
  useImperativeHandle(ref, () => ({ element: map }))

  const createdRef = useRef<boolean>(false)
  useEffect(() => {
    if (map != null && createdRef.current === false && whenCreated != null) {
      whenCreated(map)
    }
  }, [map, whenCreated])

  const contents = map ? (
    <LeafletProvider value={{ map }}>{children}</LeafletProvider>
  ) : null
  return (
    <div ref={mapRef} className={className} id={id} style={style}>
      {contents}
    </div>
  )
}

export const LeafletMap = forwardRef(MapComponent)