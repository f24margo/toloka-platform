import wixData from 'wix-data';
import { currentMember } from 'wix-members-frontend';

let memberData = null;

$w.onReady(async function () {
    console.log('🌱 Дошка завантажена');

    const iframe = $w('#html1');

    iframe.onMessage(async (event) => {
        console.log('📩 Отримано:', event.data.type);

        if (event.data.type === 'IFRAME_READY') {
            console.log('✅ iframe готовий');
            await sendUserData(iframe);
            await loadAnnouncements(iframe);
        }

        if (event.data.type === 'GET_ANNOUNCEMENTS') {
            await loadAnnouncements(iframe);
        }

        if (event.data.type === 'GET_USER') {
            await sendUserData(iframe);
        }

        if (event.data.type === 'SUBMIT_ANNOUNCEMENT') {
            await handleNewAnnouncement(event.data.data, iframe);
        }
    });

    console.log('✅ Слухач підключено');
});

async function sendUserData(iframe) {
    try {
        memberData = await currentMember.getMember();
        if (memberData) {
            console.log('✅ Користувач:', memberData.loginEmail);
            iframe.postMessage({
                type: 'SET_USER',
                data: {
                    isLoggedIn: true,
                    name: memberData.profile?.nickname ||
                          memberData.contactDetails?.firstName ||
                          'Учасник',
                    email: memberData.loginEmail || ''
                }
            });
        } else {
            iframe.postMessage({ type: 'SET_USER', data: { isLoggedIn: false } });
        }
    } catch (err) {
        console.log('ℹ️ Гість');
        iframe.postMessage({ type: 'SET_USER', data: { isLoggedIn: false } });
    }
}

async function loadAnnouncements(iframe) {
    console.log('📋 Завантаження...');
    try {
        const result = await wixData.query('Announcements')
            .eq('status', 'published')
            .descending('createdDate')
            .limit(100)
            .find();

        console.log(`✅ Знайдено ${result.items.length} оголошень`);
        iframe.postMessage({ type: 'LOAD_ANNOUNCEMENTS', data: result.items });

    } catch (err) {
        console.error('❌ Помилка:', err.message);
    }
}

async function handleNewAnnouncement(data, iframe) {
    console.log('📢 Нове оголошення');
    console.log('🖼️ Фото URLs:', data.photos);

    try {
        const name = memberData?.profile?.nickname ||
                    memberData?.contactDetails?.firstName || 'Учасник';
        const email = memberData?.loginEmail || '';

        const announcement = {
            title: data.title,
            description: data.description || '',
            category: data.category,
            authorName: name,
            authorEmail: email,
            memberId: memberData?._id || '',
            photos: data.photos.join(', '),
            createdDate: new Date(),
            status: 'published'
        };

        const saved = await wixData.insert('Announcements', announcement);
        console.log('✅ ЗБЕРЕЖЕНО! ID:', saved._id);

        iframe.postMessage({ type: 'ANNOUNCEMENT_SAVED' });
        await loadAnnouncements(iframe);

    } catch (err) {
        console.error('❌ ПОМИЛКА:', err.message);
    }
}