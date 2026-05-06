export class DomainError extends Error {
  constructor(
    public readonly kind: 'menu_item_not_found' | 'menu_item_inactive',
    message: string
  ) {
    super(message)
    this.name = 'DomainError'
  }
}
