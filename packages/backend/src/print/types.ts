export interface PrintOrder {
  dailyNumber: number
  customerName: string
  customerPhone: string
  pickupTime: string | null
  paymentMethod: string | null
  paymentStatus: string | null
  notes: string | null
  totalPrice: string
  createdAt: Date | string
}

export interface PrintLine {
  id: number
  quantity: number
  itemNameSnap: string
  unitLabelSnap: string | null
  categorySnap: string
  priceSnap: string
}
