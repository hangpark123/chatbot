const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');
const fs = require('fs').promises;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function writeToFirestore(data) {
    try {
        // 데이터의 각 항목을 Firestore에 저장
        for (const item of data) {
            // 각 날짜를 필드 이름으로 사용하여 데이터를 '기숙사' 문서에 저장
            await db.collection('학식').doc('기숙사').set({ [item.date]: item }, { merge: true });
        }
        console.log("데이터가 Firestore에 성공적으로 저장되었습니다.");
    } catch (error) {
        console.error("Firestore에 데이터를 저장하는 도중 오류가 발생했습니다:", error);
        throw error;
    }
}


async function main() {
    try {
        // JSON 파일 읽기
        const jsonData = await fs.readFile('crawl_met_dorm.json', 'utf8');
        const data = JSON.parse(jsonData).data;

        // Firestore에 데이터 저장
        await writeToFirestore(data);
    } catch (error) {
        console.error("처리 도중 오류가 발생했습니다:", error);
    }
}

main();
