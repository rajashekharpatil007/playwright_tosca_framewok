Feature: Create Automobile insurance quotes
  As a user of the Vehicle Insurance Application
  I want to complete the automobile quote workflow
  So that the available quote option can be selected

  Scenario Outline: <caseName> [<caseId>]
    Given I open the configured insurance application
    When I select the vehicle type for case "<caseId>"
    And I complete the Vehicle Data form for case "<caseId>"
    And I complete the Insurant Data form for case "<caseId>"
    And I complete the Product Data form for case "<caseId>"
    And I choose the price option for case "<caseId>"
    Then I return home after confirming the quote option for case "<caseId>"

    Examples:
      | caseId | caseName |
      | automobile-straightthrough | StraightThrough |
      | automobile-engine-performance-between-1000-and-2000 | Engine performance between 1000 and 2000 |
      | automobile-manufactured-more-than-5-years-in-the-past | Manufactured more than 5 Years in the Past |
      | automobile-list-price-between-50k-and-100k | List price between 50K and 100K |
      | automobile-age-between-18-an-25 | Age between 18 an 25 |
      | automobile-age-between-56-and-70 | Age between 56 and 70 |
      | automobile-female | Female |
      | automobile-start-date-month-after-next-month | Start date month after next month |
      | automobile-insuarance-sum-between-15m-and-35m | Insuarance sum between 15M and 35M |
      | automobile-merit-rating-super-bonus | Merit Rating Super Bonus |
      | automobile-merit-rating-malus-between-10-and-17 | Merit Rating malus between 10 and 17 |
      | automobile-damage-insurance-no-coverage | Damage Insurance No Coverage |
      | automobile-damage-insurance-full-coverage | Damage Insurance Full Coverage |
      | automobile-euro-protection | Euro Protection |
      | automobile-courtesy-car | Courtesy Car |
      | automobile-optional-products-3 | Optional Products_3 |
