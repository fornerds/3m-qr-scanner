#!/usr/bin/env node

// 제품 데이터 초기화 스크립트
// 사용법: node scripts/init-products.js [--force]

const fetch = require('node-fetch');

const API_URL = process.env.API_URL || 'http://localhost:3000';
const force = process.argv.includes('--force');

async function initProducts() {
  try {
    console.log('제품 데이터 초기화 시작...');
    console.log(`API URL: ${API_URL}/api/init-products`);
    console.log(`Force 모드: ${force ? 'ON' : 'OFF'}`);
    console.log('');

    const response = await fetch(`${API_URL}/api/init-products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ force })
    });

    const data = await response.json();

    if (data.success) {
      console.log('초기화 성공!');
      console.log(`${data.message}`);
      if (data.insertedCount) {
        console.log(`삽입된 제품 수: ${data.insertedCount}`);
      }
      if (data.existingCount) {
        console.log(`기존 제품 수: ${data.existingCount}`);
      }
    } else {
      console.error('초기화 실패:');
      console.error(`${data.message}`);
      process.exit(1);
    }

  } catch (error) {
    console.error('오류 발생:');
    console.error(error.message);
    process.exit(1);
  }
}

async function checkStatus() {
  try {
    console.log('제품 데이터 상태 확인...');
    
    const response = await fetch(`${API_URL}/api/init-products`);
    const data = await response.json();

    if (data.success) {
      console.log(`제품 수: ${data.productCount}`);
      console.log(`초기화 상태: ${data.initialized ? '완료' : '미완료'}`);
      
      if (data.sampleProducts && data.sampleProducts.length > 0) {
        console.log('\n샘플 제품:');
        data.sampleProducts.slice(0, 3).forEach((product, index) => {
          console.log(`  ${index + 1}. ${product.name} (${product.sku})`);
        });
      }
    } else {
      console.error('상태 확인 실패:', data.message);
    }
  } catch (error) {
    console.error('상태 확인 오류:', error.message);
  }
}

// 메인 실행
async function main() {
  console.log('3M 제품 데이터 초기화 도구');
  console.log('================================\n');

  // 먼저 상태 확인
  await checkStatus();
  console.log('');

  // 초기화 실행
  await initProducts();
  console.log('');

  // 완료 후 상태 재확인
  console.log('초기화 후 상태 확인...');
  await checkStatus();
  
  console.log('\n작업 완료!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { initProducts, checkStatus }; 