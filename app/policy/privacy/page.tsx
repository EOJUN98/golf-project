export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-2">TUGOL 개인정보처리방침</h1>
        <p className="text-sm text-gray-500 mb-8">시행일: 2026년 1월 15일</p>

        <div className="space-y-8 text-gray-800 leading-relaxed">
          {/* 서문 */}
          <section>
            <p className="font-bold text-lg mb-2">
              TUGOL(이하 '회사')은 회원의 개인정보를 매우 중요하게 생각하며,
              「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등
              관련 법령을 준수하고 있습니다.
            </p>
            <p className="text-sm text-gray-600">
              본 개인정보처리방침은 회사가 제공하는 서비스 이용 시 수집·이용되는 개인정보와
              그 보호를 위한 회사의 조치사항을 안내합니다.
            </p>
          </section>

          {/* 1. 수집하는 개인정보 항목 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">1. 수집하는 개인정보 항목</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">✅ 필수 정보 (회원가입 시 자동 수집)</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>카카오 연동 시:</strong> 이메일 주소, 닉네임, 프로필 사진</li>
                  <li><strong>예약 및 결제 시:</strong> 결제 정보 (카드 정보는 토스페이먼츠에서 관리, 회사는 저장하지 않음)</li>
                  <li><strong>서비스 이용 기록:</strong> 접속 IP, 쿠키, 서비스 이용 기록, 예약 내역</li>
                </ul>
              </div>

              <div>
                <h3 className="font-bold text-lg mb-2">⚙️ 선택 정보 (회원 동의 시 수집)</h3>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  <li><strong>위치 정보:</strong> GPS 기반 현재 위치 (LBS 할인 적용 시)</li>
                  <li><strong>휴대전화 번호:</strong> 예약 확인 알림 발송 시</li>
                  <li><strong>마케팅 수신 동의:</strong> 이벤트, 프로모션 정보 수신 여부</li>
                </ul>
              </div>

              <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
                <p className="text-sm text-yellow-800">
                  <strong>💡 선택 정보 미제공 시:</strong> 회원가입 및 서비스 이용은 가능하나,
                  위치 기반 할인, 알림 수신 등 일부 기능이 제한될 수 있습니다.
                </p>
              </div>
            </div>
          </section>

          {/* 2. 개인정보의 수집 및 이용 목적 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">2. 개인정보의 수집 및 이용 목적</h2>
            <ul className="list-decimal list-inside space-y-2 ml-4">
              <li><strong>회원 관리:</strong> 회원 식별, 본인 확인, 부정 이용 방지</li>
              <li><strong>서비스 제공:</strong> 티타임 예약, 결제 처리, 예약 확인 안내</li>
              <li><strong>맞춤형 서비스:</strong> 사용자 세그먼트 분석 (PRESTIGE, CHERRY 등), 위치 기반 할인</li>
              <li><strong>서비스 개선:</strong> 이용 통계 분석, 신규 서비스 개발, AI 가격 알고리즘 최적화</li>
              <li><strong>고객 지원:</strong> 문의 응대, 분쟁 조정, 공지사항 전달</li>
              <li><strong>마케팅 (선택):</strong> 이벤트, 프로모션 정보 제공 (동의한 경우에 한함)</li>
            </ul>
          </section>

          {/* 3. 개인정보의 보유 및 이용 기간 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">3. 개인정보의 보유 및 이용 기간</h2>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>회원 탈퇴 시까지</strong> 개인정보를 보유하며, 탈퇴 즉시 지체 없이 파기합니다.</li>
              <li><strong>단, 관련 법령에 따라 보존이 필요한 경우</strong> 해당 기간 동안 보존합니다:
                <ul className="list-disc list-inside ml-6 mt-1 text-sm space-y-1">
                  <li>계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</li>
                  <li>대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</li>
                  <li>소비자 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</li>
                  <li>접속 로그 기록: 3개월 (통신비밀보호법)</li>
                </ul>
              </li>
            </ul>
          </section>

          {/* 4. 개인정보의 제3자 제공 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">4. 개인정보의 제3자 제공</h2>
            <p className="mb-3">회사는 회원의 개인정보를 원칙적으로 외부에 제공하지 않습니다.</p>
            <p className="mb-2"><strong>단, 다음의 경우 예외로 합니다:</strong></p>
            <ul className="list-decimal list-inside space-y-2 ml-4">
              <li>회원이 사전에 동의한 경우</li>
              <li>법령의 규정에 의하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</li>
            </ul>
          </section>

          {/* 5. 개인정보 처리 위탁 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">5. 개인정보 처리 위탁</h2>
            <p className="mb-3">회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다:</p>
            <table className="w-full border-collapse border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2">수탁업체</th>
                  <th className="border border-gray-300 p-2">위탁 업무 내용</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-gray-300 p-2">토스페이먼츠(주)</td>
                  <td className="border border-gray-300 p-2">전자결제 대행</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">Supabase Inc.</td>
                  <td className="border border-gray-300 p-2">데이터베이스 및 클라우드 서버 운영</td>
                </tr>
                <tr>
                  <td className="border border-gray-300 p-2">카카오(주)</td>
                  <td className="border border-gray-300 p-2">소셜 로그인 인증</td>
                </tr>
              </tbody>
            </table>
            <p className="text-sm text-gray-600 mt-2">
              위탁 계약 시 개인정보 보호법에 따라 안전하게 관리하도록 규정하고 있으며,
              위탁 내용이나 수탁 업체가 변경될 경우 공지사항을 통해 알려드립니다.
            </p>
          </section>

          {/* 6. 회원의 권리와 행사 방법 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">6. 회원의 권리와 행사 방법</h2>
            <p className="mb-2">회원은 언제든지 다음의 권리를 행사할 수 있습니다:</p>
            <ul className="list-disc list-inside space-y-2 ml-4">
              <li><strong>개인정보 열람 요구</strong></li>
              <li><strong>개인정보 정정·삭제 요구</strong> (법령에 의해 보존이 필요한 경우 제외)</li>
              <li><strong>개인정보 처리 정지 요구</strong></li>
              <li><strong>회원 탈퇴 (개인정보 삭제 요구)</strong></li>
            </ul>
            <p className="mt-3 text-sm">
              권리 행사는 <strong>고객센터(support@tugol.com)</strong> 또는 서비스 내 "설정 &gt; 내 정보 관리"를 통해 가능합니다.
            </p>
          </section>

          {/* 7. 개인정보 자동 수집 (쿠키) */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">7. 개인정보 자동 수집 장치 (쿠키)</h2>
            <p className="mb-2">
              회사는 서비스 이용 편의성 향상을 위해 쿠키(Cookie)를 사용합니다.
            </p>
            <ul className="list-disc list-inside space-y-1 ml-4 text-sm">
              <li><strong>쿠키의 사용 목적:</strong> 로그인 상태 유지, 맞춤형 서비스 제공</li>
              <li><strong>쿠키 거부 방법:</strong> 브라우저 설정에서 쿠키 차단 가능 (일부 기능 제한될 수 있음)</li>
            </ul>
          </section>

          {/* 8. 개인정보 보호를 위한 기술적·관리적 대책 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">8. 개인정보 보호를 위한 대책</h2>
            <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
              <li><strong>암호화:</strong> 비밀번호 등 중요 정보는 암호화하여 저장</li>
              <li><strong>접근 통제:</strong> 개인정보 처리 시스템 접근 권한 최소화</li>
              <li><strong>보안 프로그램:</strong> 해킹, 바이러스 방지를 위한 보안 프로그램 운영</li>
              <li><strong>직원 교육:</strong> 개인정보 취급 직원에 대한 정기 교육 실시</li>
            </ul>
          </section>

          {/* 9. 개인정보 보호책임자 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">9. 개인정보 보호책임자</h2>
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <p className="font-bold mb-2">개인정보 보호책임자</p>
              <ul className="text-sm space-y-1">
                <li>이름: 개인정보보호팀장</li>
                <li>이메일: privacy@tugol.com</li>
                <li>전화: 1234-5678</li>
                <li>운영시간: 평일 09:00-18:00 (주말/공휴일 휴무)</li>
              </ul>
            </div>
            <p className="text-sm text-gray-600 mt-3">
              개인정보 침해에 대한 신고나 상담이 필요하신 경우 아래 기관에 문의 가능합니다:
            </p>
            <ul className="text-xs text-gray-600 mt-2 space-y-1 ml-4">
              <li>개인정보침해신고센터: (국번없이) 118 / privacy.kisa.or.kr</li>
              <li>대검찰청 사이버수사과: (국번없이) 1301 / www.spo.go.kr</li>
              <li>경찰청 사이버안전국: (국번없이) 182 / cyberbureau.police.go.kr</li>
            </ul>
          </section>

          {/* 10. 아동의 개인정보 보호 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">10. 아동의 개인정보 보호</h2>
            <p>
              회사는 만 19세 미만의 아동으로부터 개인정보를 수집하지 않습니다.
              만 19세 미만은 회원가입이 불가능하며, 이를 위반한 경우 계정이 삭제될 수 있습니다.
            </p>
          </section>

          {/* 11. 개인정보처리방침 변경 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-blue-600">11. 개인정보처리방침 변경</h2>
            <p>
              본 개인정보처리방침은 법령·정책 또는 보안 기술의 변경에 따라 내용이 추가·삭제 및 수정될 수 있습니다.
              변경 시 시행일자 7일 전에 공지사항을 통해 알려드립니다.
            </p>
          </section>

          {/* 부칙 */}
          <section className="mt-12 pt-8 border-t border-gray-300">
            <h2 className="text-lg font-bold mb-2">부칙</h2>
            <p className="text-sm text-gray-600">본 개인정보처리방침은 2026년 1월 15일부터 시행됩니다.</p>
            <p className="text-sm text-gray-600 mt-2">
              문의: privacy@tugol.com | 고객센터: 1234-5678 (평일 09:00-18:00)
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors">
            메인으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
