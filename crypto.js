// AES 加密解密相关函数
const AES_KEY = 'UKu52ePUBwetZ9wNX88o54dnfKRu0T1l';
const FIXED_HEADER = new Uint8Array([
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00
]);
const TAIL_BYTE = 0x0B;

// Base64 解码
function base64ToBytes(base64) {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

// Base64 编码
function bytesToBase64(bytes) {
    let binaryString = '';
    for (let i = 0; i < bytes.length; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
}

// PKCS7 移除填充
function removePadding(data) {
    const paddingLength = data[data.length - 1];
    return data.slice(0, data.length - paddingLength);
}

// PKCS7 添加填充
function addPadding(data) {
    const blockSize = 16;
    const paddingLength = blockSize - (data.length % blockSize);
    const padded = new Uint8Array(data.length + paddingLength);
    padded.set(data);
    for (let i = data.length; i < padded.length; i++) {
        padded[i] = paddingLength;
    }
    return padded;
}

// 解密函数
async function decryptSave(fileData) {
    try {
        // 移除头部 22 字节
        let offset = 22;

        // 读取长度前缀（可变长度）
        let dataLength = 0;
        let shift = 0;
        while (offset < fileData.length) {
            const byte = fileData[offset++];
            dataLength |= (byte & 0x7F) << shift;
            if ((byte & 0x80) === 0) break;
            shift += 7;
        }

        // 移除末尾 1 字节
        const endPos = fileData.length - 1;

        // 提取 Base64 数据
        const base64Data = new TextDecoder().decode(fileData.slice(offset, endPos));

        // Base64 解码
        const encryptedData = base64ToBytes(base64Data);

        // AES 解密
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(AES_KEY),
            { name: 'AES-CBC' },
            false,
            ['decrypt']
        );

        // 使用零 IV 进行 ECB 模式模拟
        const iv = new Uint8Array(16);
        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-CBC', iv: iv },
            key,
            encryptedData
        );

        // 移除填充
        const unpaddedData = removePadding(new Uint8Array(decrypted));

        // 转换为 JSON
        const jsonString = new TextDecoder().decode(unpaddedData);
        return JSON.parse(jsonString);
    } catch (error) {
        console.error('解密失败:', error);
        throw new Error('解密失败，请确保文件格式正确');
    }
}

// 加密函数
async function encryptSave(jsonData) {
    try {
        // JSON 转字符串
        const jsonString = JSON.stringify(jsonData);
        const data = new TextEncoder().encode(jsonString);

        // 添加填充
        const paddedData = addPadding(data);

        // AES 加密
        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(AES_KEY),
            { name: 'AES-CBC' },
            false,
            ['encrypt']
        );

        const iv = new Uint8Array(16);
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-CBC', iv: iv },
            key,
            paddedData
        );

        // Base64 编码
        const base64Data = bytesToBase64(new Uint8Array(encrypted));
        const base64Bytes = new TextEncoder().encode(base64Data);

        // 生成长度前缀
        let dataLength = base64Bytes.length;
        const lengthPrefix = [];
        while (dataLength > 0x7F) {
            lengthPrefix.push((dataLength & 0x7F) | 0x80);
            dataLength >>= 7;
        }
        lengthPrefix.push(dataLength & 0x7F);

        // 组装最终数据
        const totalLength = FIXED_HEADER.length + lengthPrefix.length + base64Bytes.length + 1;
        const result = new Uint8Array(totalLength);

        let offset = 0;
        result.set(FIXED_HEADER, offset);
        offset += FIXED_HEADER.length;

        result.set(new Uint8Array(lengthPrefix), offset);
        offset += lengthPrefix.length;

        result.set(base64Bytes, offset);
        offset += base64Bytes.length;

        result[offset] = TAIL_BYTE;

        return result;
    } catch (error) {
        console.error('加密失败:', error);
        throw new Error('加密失败');
    }
}
