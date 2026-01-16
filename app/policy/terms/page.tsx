export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl p-8">
        <h1 className="text-3xl font-bold mb-2">TUGOL 서비스 이용약관</h1>
        <p className="text-sm text-gray-500 mb-8">시행일: 2026년 1월 15일</p>

        <div className="space-y-8 text-gray-800 leading-relaxed">
          {/* 제1조 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제1조 (목적)</h2>
            <p>
              본 약관은 TUGOL(이하 '회사')이 제공하는 골프장 예약 중개 서비스(이하 '서비스')의 이용과 관련하여
              회사와 회원 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          {/* 제2조 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제2조 (정의)</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li><strong>"회원"</strong>이란 본 약관에 동의하고 회사가 제공하는 서비스를 이용하는 자를 말합니다.</li>
              <li><strong>"티타임"</strong>이란 골프장에서 골프를 시작할 수 있는 예약 가능한 시간대를 말합니다.</li>
              <li><strong>"예약"</strong>이란 회원이 티타임을 선택하고 결제를 완료한 상태를 말합니다.</li>
              <li><strong>"노쇼(No-Show)"</strong>란 예약 확정 후 사전 취소 없이 해당 티타임에 출석하지 않은 경우를 말합니다.</li>
            </ol>
          </section>

          {/* 제3조 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제3조 (약관의 효력 및 변경)</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>본 약관은 회원이 약관 내용에 동의하고 회원가입을 완료함으로써 효력이 발생합니다.</li>
              <li>회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며,
                  변경된 약관은 시행일 7일 전에 서비스 내 공지합니다.</li>
              <li>회원이 변경된 약관에 동의하지 않을 경우 서비스 이용을 중단하고 탈퇴할 수 있습니다.</li>
            </ol>
          </section>

          {/* 제4조 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제4조 (회원가입)</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>회원가입은 만 19세 이상만 가능합니다.</li>
              <li>회원은 실명 및 실제 정보를 기재하여야 하며, 허위 정보 기재 시 서비스 이용이 제한될 수 있습니다.</li>
              <li>회원은 자신의 계정을 타인에게 양도하거나 대여할 수 없습니다.</li>
            </ol>
          </section>

          {/* 제5조 - 핵심 예약 및 결제 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제5조 (예약 및 결제)</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>회원은 서비스를 통해 원하는 티타임을 선택하고 결제를 완료하여 예약할 수 있습니다.</li>
              <li>예약 시 표시되는 가격은 <strong>동적 가격 알고리즘</strong>에 따라 실시간으로 변동될 수 있으며,
                  날씨, 시간, 회원 등급 등이 고려됩니다.</li>
              <li>결제는 회사가 지정한 전자결제 수단(토스페이먼츠 등)을 통해 진행되며,
                  결제 완료 시점에 예약이 확정됩니다.</li>
              <li>예약 확정 후에는 원칙적으로 <strong>취소 및 환불이 불가능</strong>합니다.
                  단, 제6조에 명시된 기상 악화의 경우는 예외로 합니다.</li>
            </ol>
          </section>

          {/* 제6조 - 핵심 환불 규정 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-red-600">제6조 (환불 규정 - 중요)</h2>
            <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 mb-4">
              <p className="font-bold text-yellow-800">⚠️ 필독: 환불은 기상 조건에 따라 자동 처리됩니다</p>
            </div>
            <ol className="list-decimal list-inside space-y-3 ml-4">
              <li>
                <strong className="text-red-600">기상 악화 시 자동 환불</strong>
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>예약 당일 해당 티타임 시간대의 <strong>시간당 강수량이 10mm 이상</strong>인 경우,
                      예약은 자동으로 취소되며 <strong>결제 금액의 100%가 환불</strong>됩니다.</li>
                  <li>환불은 기상청 데이터를 기준으로 자동 처리되며, 별도의 환불 신청이 필요하지 않습니다.</li>
                  <li>환불 처리는 기상 조건 확인 후 영업일 기준 3~5일 이내에 완료됩니다.</li>
                </ul>
              </li>
              <li>
                <strong>회원의 개인 사정에 의한 취소</strong>
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>회원의 단순 변심, 일정 변경 등 개인 사정으로 인한 예약 취소는 <strong>환불이 불가능</strong>합니다.</li>
                  <li>예약 시 회원은 이를 충분히 인지하고 신중하게 예약하여야 합니다.</li>
                </ul>
              </li>
              <li>
                <strong>회사의 귀책사유로 인한 취소</strong>
                <ul className="list-disc list-inside ml-6 mt-2 space-y-1 text-sm">
                  <li>골프장의 운영 중단, 시스템 오류 등 회사의 귀책사유로 서비스 제공이 불가능한 경우
                      전액 환불합니다.</li>
                </ul>
              </li>
            </ol>
          </section>

          {/* 제7조 - 노쇼 페널티 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제7조 (노쇼 페널티)</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>예약 후 사전 취소 없이 티타임에 출석하지 않은 경우 <strong>노쇼로 기록</strong>되며,
                  회원의 신용 점수(Cherry Score)가 감소합니다.</li>
              <li>노쇼가 <strong>3회 이상 누적</strong>될 경우, 회원 계정은 <strong>자동으로 이용 정지</strong>되며
                  향후 서비스 이용이 제한됩니다.</li>
              <li>허위 노쇼 신고 또는 악의적인 예약 행위가 적발될 경우 즉시 계정이 영구 정지될 수 있습니다.</li>
            </ol>
          </section>

          {/* 제8조 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제8조 (회사의 의무)</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>회사는 안정적인 서비스 제공을 위해 최선을 다합니다.</li>
              <li>회사는 회원의 개인정보를 관련 법령에 따라 보호하며,
                  개인정보처리방침에서 정한 바에 따라 처리합니다.</li>
              <li>회사는 서비스 이용과 관련하여 발생하는 회원의 불만사항을 신속히 처리합니다.</li>
            </ol>
          </section>

          {/* 제9조 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제9조 (회원의 의무)</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>회원은 예약 시 정확한 정보를 입력하여야 합니다.</li>
              <li>회원은 예약한 티타임에 성실히 출석하여야 하며, 부득이한 사정이 있을 경우
                  사전에 고객센터에 연락하여야 합니다.</li>
              <li>회원은 서비스를 부정한 목적으로 이용해서는 안 되며,
                  타인의 명의나 정보를 도용하여서는 안 됩니다.</li>
            </ol>
          </section>

          {/* 제10조 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제10조 (면책 조항)</h2>
            <ol className="list-decimal list-inside space-y-2 ml-4">
              <li>회사는 천재지변, 전쟁, 테러 등 불가항력적인 사유로 서비스를 제공할 수 없는 경우
                  책임이 면제됩니다.</li>
              <li>회사는 회원이 골프장 내에서 발생한 안전사고, 분쟁 등에 대해 책임지지 않습니다.
                  골프장 내 사고는 해당 골프장과 회원 간의 문제입니다.</li>
              <li>회사는 회원 간 또는 회원과 제3자 간의 거래 및 분쟁에 대해 개입하지 않으며 책임지지 않습니다.</li>
            </ol>
          </section>

          {/* 제11조 */}
          <section>
            <h2 className="text-xl font-bold mb-3 text-green-600">제11조 (분쟁 해결)</h2>
            <p>
              본 약관과 관련된 분쟁은 대한민국 법률에 따르며,
              관할 법원은 회사의 본사 소재지를 관할하는 법원으로 합니다.
            </p>
          </section>

          {/* 부칙 */}
          <section className="mt-12 pt-8 border-t border-gray-300">
            <h2 className="text-lg font-bold mb-2">부칙</h2>
            <p className="text-sm text-gray-600">본 약관은 2026년 1월 15일부터 시행됩니다.</p>
            <p className="text-sm text-gray-600 mt-2">
              고객센터: support@tugol.com | 평일 09:00-18:00 (주말/공휴일 휴무)
            </p>
          </section>
        </div>

        <div className="mt-8 text-center">
          <a href="/" className="inline-block bg-green-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-700 transition-colors">
            메인으로 돌아가기
          </a>
        </div>
      </div>
    </div>
  );
}
