import { locationPopup } from './locationPopup';

test('renders untrusted names as text and rejects script URLs', () => {
    const visit = jest.fn();
    const popup = locationPopup({shopid: 42, shopname: '<img src=x onerror=alert(1)>',
        addressname: 'An address', distance: 1, website: 'javascript:alert(1)'}, visit);
    expect(popup.querySelector('img')).toBeNull();
    expect(popup.querySelector('a')).toBeNull();
    expect(popup.querySelector('h3').textContent).toContain('<img');
    popup.querySelector('button').click();
    expect(visit).toHaveBeenCalledWith(42);
});
