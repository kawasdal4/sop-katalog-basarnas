import fetch from 'node-fetch';
import FormData from 'form-data';

async function testUpdateProfile() {
    console.log('Sending request to update profile...');

    // Create a minimal FormData object mimicking a photo removal or simple name update
    const formData = new FormData();
    formData.append('name', 'Admin Basarnas');
    formData.append('email', 'admin@basarnas.go.id');

    try {
        const res = await fetch('http://localhost:3000/api/users/profile', {
            method: 'PUT',
            body: formData,
            // In a real scenario we need the auth cookie, but since we are just checking where it fails...
            // Let's see what the response is 
        });

        const data = await res.json();
        console.log('Response status:', res.status);
        console.log('Response body:', data);
    } catch (error) {
        console.error('Request failed:', error);
    }
}

testUpdateProfile();
