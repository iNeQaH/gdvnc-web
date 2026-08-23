export async function uploadToImgur(dataUrl: string): Promise<string> {
  const base64Data = dataUrl.split(',')[1] || dataUrl;
  const clientId = process.env.NEXT_PUBLIC_IMGUR_CLIENT_ID || '8259d6174a75a7e';

  const formData = new FormData();
  formData.append('image', base64Data);
  formData.append('type', 'base64');

  const response = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: { Authorization: Client-ID  },
    body: formData,
  });

  if (!response.ok) throw new Error('Failed to upload image to Imgur');
  
  const data = await response.json();
  return data.data.link;
}
